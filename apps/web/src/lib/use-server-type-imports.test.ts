/**
 * Regression guard for `"use server"` files under Next.js 16 + Turbopack.
 *
 * Two distinct bug classes are covered:
 *
 * 1. **Mixed type/value imports** — `import { type X, y } from '...'`
 *    The Server Action transform does not reliably erase inline `type`
 *    specifiers, leaving the type name as a value reference in the bundled
 *    server chunk and producing `ReferenceError: <Type> is not defined` on
 *    first invocation.
 *
 *    Safe pattern: split into two statements.
 *      import type { ToggleLikeResult } from '...';
 *      import { togglePositionLike } from '...';
 *
 * 2. **`export type { ... }` re-export statements** — both forms:
 *      export type { X };                  // re-export of locally-imported type
 *      export type { X } from '...';       // direct re-export from another module
 *    These survive the Server Action transform as value exports under
 *    Next.js 16 + Turbopack and crash at module evaluation time with the
 *    same `ReferenceError`. Reproduced 2026-04-10 as
 *    `ReferenceError: ToggleLikeResult is not defined` from three
 *    `toggleLike` actions (position-memory, topics/openings, topics/squares).
 *
 *    Safe pattern: define the type in a separate, non-`"use server"` module
 *    (e.g., `_lib/types.ts`, `@/lib/<feature>/...`) and have consumers
 *    `import type` from there. Inside the `"use server"` file, use the type
 *    locally (unexported) or only via `import type`.
 *
 *    NOTE: `export type Foo = ...` (a local type alias declaration with an
 *    `export` modifier) is NOT covered by this guard. Empirically it does
 *    not produce the same runtime error — only brace re-export syntax does.
 *    If a future regression proves otherwise, tighten this regex.
 *
 * The ESLint rule `@typescript-eslint/consistent-type-imports` with
 * `prefer: 'type-imports'` is NOT sufficient on its own:
 *   - Inline `import { type X, y }` already satisfies "prefer type-imports"
 *     and the rule will not flag it.
 *   - ESLint has no rule at all against `export type` in `"use server"`
 *     files; it is a Next.js-runtime-specific constraint.
 * This static test fills both gaps.
 */
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Matches a single-line import statement with a brace specifier list.
const IMPORT_STMT_RE = /^\s*import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]+['"]\s*;?\s*$/gm;

// Matches `export type { ... }` brace re-export forms at statement position:
//   export type { Foo };
//   export type { Foo, Bar };
//   export type { Foo } from './x';
//   export type { Foo, Bar } from './x';
// Does NOT match `export type Foo = ...` local alias declarations.
const EXPORT_TYPE_BRACE_RE = /^\s*export\s+type\s*\{[^}]*\}(?:\s*from\s*['"][^'"]+['"])?\s*;?/gm;

function hasMixedTypeAndValueSpecifiers(specifierList: string): boolean {
  const specifiers = specifierList
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (specifiers.length < 2) return false;
  const hasType = specifiers.some((s) => /^type\s+\w/.test(s));
  const hasValue = specifiers.some((s) => !/^type\s+\w/.test(s));
  return hasType && hasValue;
}

async function listUseServerFiles(): Promise<Array<{ abs: string; rel: string }>> {
  const repoWebRoot = join(__dirname, '..', '..');
  const files = await fg('src/**/*.{ts,tsx}', {
    cwd: repoWebRoot,
    absolute: true,
    ignore: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  });

  const useServerFiles: Array<{ abs: string; rel: string }> = [];
  for (const abs of files) {
    const source = readFileSync(abs, 'utf8');
    // Allow whitespace / comments before the directive, and both quote styles.
    const head = source.slice(0, 200);
    const isUseServer = /^\s*(['"])use server\1\s*;?/m.test(head);
    if (isUseServer) {
      useServerFiles.push({ abs, rel: abs.replace(repoWebRoot + '/', '') });
    }
  }
  return useServerFiles;
}

describe('"use server" files must not mix type and value imports', () => {
  it('no `"use server"` file contains `import { type X, y }` form', async () => {
    const files = await listUseServerFiles();
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const { abs, rel } of files) {
      const source = readFileSync(abs, 'utf8');
      IMPORT_STMT_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = IMPORT_STMT_RE.exec(source)) !== null) {
        const specifierList = match[1];
        if (!specifierList) continue;
        if (hasMixedTypeAndValueSpecifiers(specifierList)) {
          const line = source.slice(0, match.index).split('\n').length;
          violations.push({ file: rel, line, text: match[0].trim() });
        }
      }
    }

    if (violations.length > 0) {
      const formatted = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.text}`).join('\n');
      throw new Error(
        `Found ${violations.length} mixed type/value import(s) in "use server" files. ` +
          `Split into \`import type { ... }\` + \`import { ... }\`:\n${formatted}`
      );
    }

    expect(violations).toEqual([]);
  });
});

describe('"use server" files must not contain `export type { ... }` re-exports', () => {
  it('no `"use server"` file re-exports a type via brace syntax (Next.js 16 + Turbopack crashes at runtime)', async () => {
    const files = await listUseServerFiles();
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const { abs, rel } of files) {
      const source = readFileSync(abs, 'utf8');
      EXPORT_TYPE_BRACE_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = EXPORT_TYPE_BRACE_RE.exec(source)) !== null) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push({ file: rel, line, text: match[0].trim() });
      }
    }

    if (violations.length > 0) {
      const formatted = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.text}`).join('\n');
      throw new Error(
        `Found ${violations.length} \`export type { ... }\` re-export(s) in "use server" files. ` +
          `Next.js 16 + Turbopack does not erase these; they cause ` +
          `\`ReferenceError: <Type> is not defined\` at runtime. Move the type to a ` +
          `separate non-"use server" module and \`import type\` it instead:\n${formatted}`
      );
    }

    expect(violations).toEqual([]);
  });
});
