/**
 * Guard: per-route-subtree client dictionary scoping stays sound.
 *
 * `src/app/[locale]/_lib/i18n-scopes.ts` declares which namespaces each
 * route subtree's nested `NextIntlClientProvider` serves, and which set the
 * root layout ships sitewide. next-intl's nested provider REPLACES the
 * parent dictionary (no merge), so an under-declared scope silently renders
 * raw message keys in production. This script recomputes what each scope can
 * actually reach and fails on any mismatch.
 *
 * What it does, per scope (and for the GLOBAL set):
 *
 * 1. Seeds with the subtree's Next.js entry files
 *    (page/layout/error/loading/not-found/template/default).
 * 2. Walks the import graph (`@/` alias + relative imports, `import()`
 *    included; external packages ignored) to the transitive closure.
 * 3. Collects every namespace a reached file consumes:
 *    - `useTranslations('ns')` / `useSafeTranslations('ns')` literals
 *      (comments stripped first),
 *    - namespace-prop literals (`i18nNamespace="…"`, `translationNamespace`,
 *      `translationKey`, `namespace`),
 *    - `EXTRA_FILE_NAMESPACES` entries for translator calls whose namespace
 *      only exists at runtime (see below).
 * 4. Requires reachable ⊆ provided, provided ⊆ reachable (no stale
 *    entries), and that no reachable namespace is classified 'server'.
 * 5. Requires each scope's subtree to actually mount its provider
 *    (`scope="<id>"` or `pickScopedMessages(…, '<id>')` in some file under
 *    the dir), so deleting a layout cannot silently widen a scope back to
 *    the root dictionary.
 *
 * Known limitation: components whose namespace arrives as a VARIABLE prop
 * (`useTranslations(namespace)`) are covered only through the literal the
 * caller passes — a namespace computed at runtime from data would be
 * invisible. Every current dynamic call site receives a literal prop.
 *
 * Usage: `pnpm --filter web check:i18n` (runs after the classification
 * check).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAMESPACE_CLASSIFICATION } from '../src/app/[locale]/_lib/i18n-namespaces';
import { GLOBAL_CLIENT_NAMESPACES, INTL_SCOPES } from '../src/app/[locale]/_lib/i18n-scopes';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');
const APP = join(SRC, 'app');

/**
 * Namespaces consumed by files whose translator calls the static scan cannot
 * attribute — the namespace exists only in a runtime string. Keyed by path
 * relative to `src/`. A file listed here contributes these namespaces to
 * every scope that can reach it, exactly like a literal call site would.
 *
 * When adding an entry, name the runtime mechanism in a comment.
 */
const EXTRA_FILE_NAMESPACES: Record<string, readonly string[]> = {
  // Resolves Server Action error CODES (`moderation.blocked`,
  // `attachment.error.*`, `postFenAttachment.error.*`,
  // `postVideoAttachment.error.*`) against the global client translator.
  'app/[locale]/(public)/topics/_lib/resolve-post-form-error.ts': [
    'attachment',
    'moderation',
    'postFenAttachment',
    'postVideoAttachment',
  ],
  // Root-scoped translator resolves `Preferences.notifications.types.*` and
  // (via getAchievementDisplayName) `Achievements.*.name` at runtime.
  'app/[locale]/(protected)/mypage/(confirmed)/notifications/_components/NotificationItem.tsx': [
    'Achievements',
    'Preferences',
  ],
};

/**
 * GLOBAL namespaces allowed to have no reachable consumer. Everything else
 * unprovided-yet-listed fails, so the sitewide payload cannot silently grow.
 */
const GLOBAL_UNREFERENCED_ALLOWED = new Set(['error']);

// --- file collection -------------------------------------------------------

const files: string[] = [];
(function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry) &&
      !full.includes('__tests__')
    ) {
      files.push(full);
    }
  }
})(SRC);
const fileSet = new Set(files);

// --- per-file parsing ------------------------------------------------------

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null; // external package
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]/g;
const NS_LITERAL_RE = /use(?:Safe)?Translations\(\s*(['"`])([^'"`)]+)\1/g;
const NS_PROP_RE =
  /(?:i18nNamespace|translationNamespace|translationKey|namespace)=\{?["'`]([^"'`]+)["'`]/g;

const importsOf = new Map<string, string[]>();
const namespacesOf = new Map<string, Set<string>>();

for (const file of files) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const imports: string[] = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const resolved = resolveImport(file, m[1] ?? m[2]!);
    if (resolved) imports.push(resolved);
  }
  importsOf.set(file, imports);

  const namespaces = new Set<string>();
  for (const m of source.matchAll(NS_LITERAL_RE)) namespaces.add(m[2]!.split('.')[0]!);
  for (const m of source.matchAll(NS_PROP_RE)) namespaces.add(m[1]!.split('.')[0]!);
  const extra = EXTRA_FILE_NAMESPACES[relative(SRC, file)];
  if (extra) for (const ns of extra) namespaces.add(ns);
  if (namespaces.size > 0) namespacesOf.set(file, namespaces);
}

// Drop prop-literal matches that are not actually message namespaces (e.g.
// an unrelated `namespace="…"` attribute): only names present in the
// classification participate in the checks below.
const knownNamespaces = new Set(Object.keys(NAMESPACE_CLASSIFICATION));

function reachableNamespaces(seeds: string[]): Set<string> {
  const seen = new Set<string>();
  const out = new Set<string>();
  const stack = [...seeds];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const namespaces = namespacesOf.get(file);
    if (namespaces) {
      for (const ns of namespaces) if (knownNamespaces.has(ns)) out.add(ns);
    }
    for (const imported of importsOf.get(file) ?? []) stack.push(imported);
  }
  return out;
}

const ENTRY_RE = /^(page|layout|error|loading|not-found|template|default)\.tsx?$/;
const isEntry = (file: string) => ENTRY_RE.test(basename(file));
const isUnder = (file: string, dir: string) => file.startsWith(`${dir}/`);

// --- checks ----------------------------------------------------------------

const failures: string[] = [];
const serverNamespaces = new Set(
  Object.entries(NAMESPACE_CLASSIFICATION)
    .filter(([, kind]) => kind === 'server')
    .map(([name]) => name)
);

function checkSet(
  label: string,
  reachable: Set<string>,
  provided: readonly string[],
  unreferencedAllowed: Set<string>
) {
  const providedSet = new Set<string>(provided);
  const missing = [...reachable].filter((ns) => !providedSet.has(ns)).sort();
  const stale = provided.filter((ns) => !reachable.has(ns) && !unreferencedAllowed.has(ns)).sort();
  const misclassified = [...reachable].filter((ns) => serverNamespaces.has(ns)).sort();
  if (missing.length > 0) {
    failures.push(
      `${label}: reachable but NOT provided (would render raw keys): ${missing.join(', ')}`
    );
  }
  if (stale.length > 0) {
    failures.push(`${label}: provided but unreachable (stale, remove): ${stale.join(', ')}`);
  }
  if (misclassified.length > 0) {
    failures.push(
      `${label}: reachable from client code but classified 'server': ${misclassified.join(', ')}`
    );
  }
}

const scopeDirs = Object.values(INTL_SCOPES).map((scope) => join(APP, scope.dir));

for (const [id, scope] of Object.entries(INTL_SCOPES)) {
  const dir = join(APP, scope.dir);
  const seeds = files.filter((file) => isUnder(file, dir) && isEntry(file));
  if (seeds.length === 0) {
    failures.push(`scope '${id}': no entry files under ${scope.dir} — wrong dir?`);
    continue;
  }
  checkSet(`scope '${id}'`, reachableNamespaces(seeds), scope.namespaces, new Set());

  // The subtree must actually mount its provider, otherwise the pages fall
  // back to the root GLOBAL dictionary and every non-global namespace 404s.
  const mounted = files.some((file) => {
    if (!isUnder(file, dir)) return false;
    const source = readFileSync(file, 'utf8');
    return (
      source.includes(`scope="${id}"`) ||
      new RegExp(`pickScopedMessages\\([^)]*'${id}'`).test(source)
    );
  });
  if (!mounted) {
    failures.push(`scope '${id}': no file under ${scope.dir} mounts ScopedIntlProvider`);
  }
}

// GLOBAL: every [locale] entry outside the scoped subtrees runs on the root
// dictionary alone.
const localeRoot = join(APP, '[locale]');
const globalSeeds = files.filter(
  (file) =>
    isUnder(file, localeRoot) && isEntry(file) && !scopeDirs.some((dir) => isUnder(file, dir))
);
checkSet(
  'GLOBAL',
  reachableNamespaces(globalSeeds),
  GLOBAL_CLIENT_NAMESPACES,
  GLOBAL_UNREFERENCED_ALLOWED
);

// EXTRA_FILE_NAMESPACES entries must point at real files, or a rename would
// silently drop their runtime namespaces from every scope.
for (const relPath of Object.keys(EXTRA_FILE_NAMESPACES)) {
  if (!fileSet.has(join(SRC, relPath))) {
    failures.push(`EXTRA_FILE_NAMESPACES: no such file: src/${relPath}`);
  }
}

if (failures.length > 0) {
  console.error('[check:i18n-scopes] FAIL\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\nFix: update the scope lists in src/app/[locale]/_lib/i18n-scopes.ts (or the classification in i18n-namespaces.ts) to match reality.'
  );
  process.exit(1);
}

console.log(
  `[check:i18n-scopes] OK — ${Object.keys(INTL_SCOPES).length} scopes + GLOBAL verified over ${files.length} files.`
);
