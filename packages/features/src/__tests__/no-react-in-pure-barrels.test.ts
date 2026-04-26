import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PURE_BARRELS = [
  "common/index.ts",
  "board-symmetry/index.ts",
  "coordinate-quiz/index.ts",
  "diagonal-quiz/index.ts",
  "legal-moves/index.ts",
  "route-planner/index.ts",
  "square-colors/index.ts",
  "ai-game/index.ts",
  "ai-game/notation-input/index.ts",
];

const REACT_IMPORT_RE = /\bfrom\s+["']react["']/;
// Matches `export { ... }` (value re-export) blocks that mention an
// identifier starting with lowercase `use` followed by an uppercase letter
// (the React hook naming convention). Type re-exports use `export type { ... }`
// which is not matched, and type identifiers conventionally start with `Use`
// (capitalized), so they also don't match.
const HOOK_VALUE_RE = /^\s*export\s*\{[^}]*\buse[A-Z][A-Za-z0-9]*\b[^}]*\}/m;
// Matches `export * from "./use-..."` — a wildcard re-export from a hook
// source file. Even with no braces, this drags every value export of the
// hook file (including the hook itself) into the pure barrel.
const HOOK_WILDCARD_RE = /export\s*\*\s*from\s*["']\.\/use-/;

describe("packages/features pure barrels", () => {
  for (const relativePath of PURE_BARRELS) {
    const absolutePath = resolve(SRC_ROOT, relativePath);

    it(`${relativePath} has no direct \`from "react"\` import`, () => {
      const source = readFileSync(absolutePath, "utf8");
      expect(source).not.toMatch(REACT_IMPORT_RE);
    });

    it(`${relativePath} does not value-export a React hook (useXxx)`, () => {
      const source = readFileSync(absolutePath, "utf8");
      expect(source).not.toMatch(HOOK_VALUE_RE);
    });

    it(`${relativePath} does not wildcard-re-export from a hook file`, () => {
      const source = readFileSync(absolutePath, "utf8");
      expect(
        source,
        `pure barrel ${relativePath} performs a wildcard re-export from a hook file (\`export * from "./use-..."\`); move this re-export to client.ts, or replace it with an explicit \`export type { ... }\` re-export of the hook's type-only surface`,
      ).not.toMatch(HOOK_WILDCARD_RE);
    });
  }
});
