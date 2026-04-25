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
  }
});
