/**
 * Regression guard: ISR-cached pages under `[locale]/(public)/` must not
 * import user-scoped authentication helpers.
 *
 * # Why this exists
 *
 * Many pages under `[locale]/(public)/` opt into ISR via either
 * `export const revalidate = <number>` or `generateStaticParams`. Their
 * rendered HTML is shared across anonymous viewers by the CDN, so any
 * per-user state baked into the HTML at render time will leak from the
 * first viewer to everyone else hitting the same cache entry.
 *
 * Next.js's automatic "opt back into dynamic" for pages that call
 * `cookies()` / `headers()` IS a partial safety net, but:
 *
 *   1. It silently degrades performance (the page stops being ISR) rather
 *      than loudly failing the build. An accidental leak regresses to
 *      dynamic rendering without anyone noticing until the next load-test.
 *   2. It does NOT catch the case where a server component fetches
 *      user-keyed data WITHOUT calling `cookies()` / `headers()` directly
 *      — e.g., via a module-level abstraction that has already resolved
 *      the user, or a query keyed on an in-closure userId.
 *   3. The failure mode when someone adds `<LikeButton userId={user.id} />`
 *      to an ISR page is subtle: the page keeps building, keeps rendering,
 *      and just serves the wrong user's state to other viewers.
 *
 * This static regression test closes that gap: it scans every file under
 * `src/app/[locale]/(public)/**` whose module surface implies ISR, and
 * flags imports of known user-scoped auth helpers. We do NOT try to be
 * sound about "the user state is actually rendered" — we flag the import,
 * period. That keeps false positives (a page that only reads the user in a
 * Server Action exported from the same file) slightly possible but
 * strongly preferable to false negatives. If a legitimate case arises,
 * tighten the heuristic at that point; don't weaken the guard.
 *
 * # How to fix a violation
 *
 *   (a) Move the user-scoped read to a client component (fetch after
 *       hydration via a Server Action or API route).
 *   (b) Opt the page out of ISR with `export const dynamic = 'force-dynamic'`
 *       at the top of the file (acceptable only if the per-user render is
 *       actually required on the server).
 *   (c) Pass the userId in from a parent dynamic boundary instead of
 *       reading it at render time in the ISR page.
 */
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// -----------------------------------------------------------------------------
// ISR-signal detection
// -----------------------------------------------------------------------------

// Matches `export const revalidate = <number>` at statement position. The
// number literal rules out `revalidate = false` (which explicitly disables
// revalidation and is not an ISR signal).
//   export const revalidate = 300;
//   export const revalidate = 60
const REVALIDATE_NUMBER_RE = /^\s*export\s+const\s+revalidate\s*=\s*\d+\s*;?\s*$/m;

// Matches either form of `generateStaticParams` export at statement position:
//   export function generateStaticParams(...) { ... }
//   export async function generateStaticParams(...) { ... }
//   export const generateStaticParams = generateLocaleStaticParams;
//   export const generateStaticParams = (...) => ...;
//   export { generateStaticParams };           // named re-export
//   export { generateStaticParams } from '...';// re-export from module
const GENERATE_STATIC_PARAMS_FN_RE = /^\s*export\s+(?:async\s+)?function\s+generateStaticParams\b/m;
const GENERATE_STATIC_PARAMS_CONST_RE = /^\s*export\s+const\s+generateStaticParams\s*=/m;
const GENERATE_STATIC_PARAMS_NAMED_RE =
  /^\s*export\s*\{[^}]*\bgenerateStaticParams\b[^}]*\}(?:\s*from\s*['"][^'"]+['"])?\s*;?/m;

// Matches `export const dynamic = 'force-dynamic'` (any quote style).
// If present, the file is explicitly opted OUT of ISR and is safe.
const FORCE_DYNAMIC_RE = /^\s*export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]\s*;?\s*$/m;

function detectIsrSignal(source: string): string | null {
  const signals: string[] = [];
  if (REVALIDATE_NUMBER_RE.test(source)) signals.push('export const revalidate = <number>');
  if (GENERATE_STATIC_PARAMS_FN_RE.test(source))
    signals.push('export function generateStaticParams');
  if (GENERATE_STATIC_PARAMS_CONST_RE.test(source))
    signals.push('export const generateStaticParams = ...');
  if (GENERATE_STATIC_PARAMS_NAMED_RE.test(source)) signals.push('export { generateStaticParams }');
  return signals.length > 0 ? signals.join(' + ') : null;
}

function isExplicitlyDynamic(source: string): boolean {
  return FORCE_DYNAMIC_RE.test(source);
}

// -----------------------------------------------------------------------------
// User-scoped auth helper import detection
//
// We detect top-level `import ... from '<module>'` statements whose module
// specifier matches a known user-scoped source, and whose named imports
// include one of the known user-scoped identifiers. We intentionally do
// NOT try to resolve re-exports or aliases — the point is to catch the
// naive case. Any clever indirection should still trigger a review.
// -----------------------------------------------------------------------------

// Known user-scoped auth helpers keyed by the exact module specifier a page
// would use. Keep values as Sets of bare identifier names (without `type`
// prefix, without aliases) that expose per-request user state.
const USER_SCOPED_HELPERS: Record<string, ReadonlySet<string>> = {
  '@/lib/auth': new Set([
    'getOptionalUser',
    'getAuthenticatedUser',
    'authenticateAndCheckBan',
    'authenticateAndGuard',
  ]),
  '@/app/[locale]/_actions/getSessionUser': new Set(['getSessionUser']),
  // `cookies()` / `headers()` are the low-level primitives. A page calling
  // these would already be forced to dynamic by Next.js, but importing them
  // in an ISR-signalled page is still a smell worth flagging explicitly:
  // it means either (a) the author intended ISR but leaked per-request
  // state, or (b) the author forgot to add `force-dynamic` and is relying
  // on silent auto-opt-out.
  'next/headers': new Set(['cookies', 'headers']),
};

// Matches a single-line `import { ... } from '<module>'` statement and
// captures the specifier list and the module path.
//   import { a, b } from '@/lib/auth';
//   import { a as x } from 'next/headers';
// Does NOT match:
//   import type { ... } from '...';       // `type` imports are erased
//   import defaultExport from '...';      // no braces
//   import * as ns from '...';            // namespace imports
const VALUE_IMPORT_RE = /^\s*import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/gm;

function extractOffendingSpecifiers(
  specifierList: string,
  forbidden: ReadonlySet<string>
): string[] {
  return (
    specifierList
      .split(',')
      .map((raw) => raw.trim())
      .filter((s) => s.length > 0)
      // Drop inline `type X` specifiers — they are erased at compile time and
      // cannot actually read per-request state at runtime.
      .filter((s) => !/^type\s+\w/.test(s))
      // Strip aliases: `foo as bar` -> `foo` (we key on the imported name).
      .map((s) => s.split(/\s+as\s+/)[0]!.trim())
      .filter((name) => forbidden.has(name))
  );
}

type Violation = {
  file: string;
  isrSignal: string;
  line: number;
  importText: string;
  offendingNames: string[];
  module: string;
};

function scanFileForViolations(rel: string, source: string): Violation[] {
  const isrSignal = detectIsrSignal(source);
  if (!isrSignal) return [];
  if (isExplicitlyDynamic(source)) return [];

  const violations: Violation[] = [];
  VALUE_IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VALUE_IMPORT_RE.exec(source)) !== null) {
    const specifierList = match[1];
    const moduleSpecifier = match[2];
    if (!specifierList || !moduleSpecifier) continue;

    const forbidden = USER_SCOPED_HELPERS[moduleSpecifier];
    if (!forbidden) continue;

    const offending = extractOffendingSpecifiers(specifierList, forbidden);
    if (offending.length === 0) continue;

    const line = source.slice(0, match.index).split('\n').length;
    violations.push({
      file: rel,
      isrSignal,
      line,
      importText: match[0].trim(),
      offendingNames: offending,
      module: moduleSpecifier,
    });
  }
  return violations;
}

async function listPublicPageFiles(): Promise<Array<{ abs: string; rel: string }>> {
  const repoWebRoot = join(__dirname, '..', '..');
  // fast-glob treats `(` and `[` as special characters. Rather than escape
  // them, we glob broadly and filter the path manually — same strategy as
  // `use-server-type-imports.test.ts`.
  const files = await fg('src/app/**/*.{ts,tsx}', {
    cwd: repoWebRoot,
    absolute: true,
    ignore: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  });
  return files
    .filter((abs) => abs.includes('/(public)/'))
    .map((abs) => ({ abs, rel: abs.replace(repoWebRoot + '/', '') }));
}

describe('puzzle detail page (ISR) must not import user-scoped auth helpers', () => {
  // Targeted smoke test — redundant with the broad scan below, but surfaces a
  // puzzle-specific regression (e.g. someone inlines `getOptionalUser()` on
  // the detail page to gate a Like button) with an obvious failure message.
  it('puzzle/[id]/page.tsx is clean', async () => {
    const files = await listPublicPageFiles();
    const detailPage = files.find(({ rel }) => rel.endsWith('puzzle/[id]/page.tsx'));
    if (!detailPage) {
      throw new Error(
        `Expected to find puzzle/[id]/page.tsx under (public)/. If the page ` +
          `was moved or renamed, update this smoke test to point at its new path.`
      );
    }
    const source = readFileSync(detailPage.abs, 'utf8');
    const violations = scanFileForViolations(detailPage.rel, source);
    expect(violations).toEqual([]);
  });
});

describe('ISR pages under [locale]/(public) must not import user-scoped auth helpers', () => {
  it('no ISR-signalled file imports getOptionalUser / getSessionUser / cookies / headers / etc.', async () => {
    const files = await listPublicPageFiles();
    const violations: Violation[] = [];

    for (const { abs, rel } of files) {
      const source = readFileSync(abs, 'utf8');
      violations.push(...scanFileForViolations(rel, source));
    }

    if (violations.length > 0) {
      const formatted = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line}\n    ISR signal: ${v.isrSignal}\n    import:     ${v.importText}\n    offending:  ${v.offendingNames.join(', ')} (from '${v.module}')`
        )
        .join('\n\n');
      throw new Error(
        `Found ${violations.length} user-scoped auth helper import(s) in ISR-cached page(s) under ` +
          `\`[locale]/(public)/\`.\n\n` +
          `Why this is unsafe: the HTML rendered by an ISR page is shared across anonymous ` +
          `viewers via the CDN. A server component that reads the current user at render ` +
          `time will bake that user's state into the cached HTML and leak it to everyone ` +
          `who hits the same cache entry.\n\n` +
          `How to fix (pick one):\n` +
          `  (a) Move the user-scoped read to a client component (fetch user state after ` +
          `hydration via a Server Action or API route).\n` +
          `  (b) Add \`export const dynamic = 'force-dynamic';\` at the top of the page to ` +
          `opt out of ISR entirely (only if per-user SSR is actually required).\n` +
          `  (c) Pass the userId as a prop from a parent dynamic boundary instead of ` +
          `reading it at render time in the ISR page.\n\n` +
          `See the module-level comment in \`src/lib/isr-user-scope-guard.test.ts\` for ` +
          `the full rationale.\n\n` +
          `Violations:\n${formatted}`
      );
    }

    expect(violations).toEqual([]);
  });
});
