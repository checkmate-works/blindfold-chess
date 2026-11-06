/**
 * Regression test for the lint bans: lints fixtures through the REAL config
 * files, from each package's cwd and from the repo root, and asserts which
 * `ban/*` rules fire.
 *
 * What it guards against is a ban that silently stops applying. In flat
 * config a later config object that sets the same rule name replaces the
 * earlier one's options, and nothing reports it — the only trace is that the
 * reason-annotated `eslint-disable` comments for the lost ban turn into
 * "unused directive" warnings. The cases below therefore check, for every
 * config that lints a given file:
 *
 * - each ban fires where it applies and stays silent at its exceptions;
 * - a file that trips several bans reports every one of them (the collision
 *   itself);
 * - a disable for one ban is consumed, not reported as unused;
 * - every real disable in the repo is still consumed, from both cwds.
 *
 * The root cwd matters because lint-staged runs `eslint --fix` from there,
 * against `eslint.config.mjs` at the root rather than the package's own
 * config; a ban missing from the root config strips the disables on commit.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

import { chessJsBan } from "../chess-js-ban.js";
import { clientIntlHooksBan } from "../client-intl-hooks-ban.js";
import { hoverUnderlineBan } from "../hover-underline-ban.js";
import { revalidatePathBan } from "../revalidate-path-ban.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const UNUSED_DIRECTIVE = /^Unused eslint-disable directive/;

const eslintByCwd = new Map();
function eslintFor(cwd) {
  if (!eslintByCwd.has(cwd)) {
    eslintByCwd.set(
      cwd,
      new ESLint({
        cwd,
        overrideConfig: {
          linterOptions: { reportUnusedDisableDirectives: "error" },
        },
      }),
    );
  }
  return eslintByCwd.get(cwd);
}

/** Every config that lints files of `pkg`: its own, and the root's. */
function configsFor(pkg) {
  return [
    { label: `cwd ${pkg}`, cwd: path.join(REPO_ROOT, pkg), prefix: "" },
    { label: "cwd <root>", cwd: REPO_ROOT, prefix: `${pkg}/` },
  ];
}

/**
 * @returns {{ bans: string[], unused: string[] }} the `ban/*` rule ids
 *   reported (sorted, deduplicated) and the unused-directive messages.
 */
async function lint(cwd, filePath, code) {
  const [result] = await eslintFor(cwd).lintText(code, {
    filePath: path.join(cwd, filePath),
  });
  const fatal = result.messages.filter((m) => m.fatal);
  assert.deepEqual(fatal, [], `parse error in fixture for ${filePath}`);
  return {
    bans: [
      ...new Set(
        result.messages
          .map((m) => m.ruleId)
          .filter((id) => id?.startsWith("ban/")),
      ),
    ].sort(),
    unused: result.messages
      .filter((m) => UNUSED_DIRECTIVE.test(m.message))
      .map((m) => `${m.line}: ${m.message}`),
  };
}

// Each fixture trips exactly one ban and is a complete, parseable module.
const REVALIDATE_PATH = `import { revalidatePath } from "next/cache";
export const a = revalidatePath;
`;
const CHESS_JS = `import { Chess } from "chess.js";
export const b = Chess;
`;
const INTL_HOOKS = `import { useTranslations, useLocale } from "next-intl";
export const c = [useTranslations, useLocale];
`;
const INTL_HOOKS_TYPE_ONLY = `import type { useTranslations } from "next-intl";
export type T = typeof useTranslations;
`;
const HOVER_UNDERLINE = `export const d = "text-sm hover:underline";
`;
const ALL = [REVALIDATE_PATH, CHESS_JS, INTL_HOOKS, HOVER_UNDERLINE];

/** Prefix the fixture's first line with a disable for `rule`. */
function disabled(fixture, rule) {
  return `// eslint-disable-next-line ${rule} -- fixture: deliberate use\n${fixture}`;
}

/** Concatenate fixtures, hoisting the imports so the module stays valid. */
function combine(...fixtures) {
  const lines = fixtures.flatMap((f) => f.trimEnd().split("\n"));
  return [
    ...lines.filter((l) => l.startsWith("import ")),
    ...lines.filter((l) => !l.startsWith("import ")),
    "",
  ].join("\n");
}

const CASES = {
  "apps/web": [
    // revalidatePath: everywhere under src/ except tests.
    ["src/lib/a.ts", REVALIDATE_PATH, ["ban/revalidate-path"]],
    ["src/lib/a.test.ts", REVALIDATE_PATH, []],
    ["src/lib/__tests__/a.ts", REVALIDATE_PATH, []],
    // chess.js: everywhere under src/, tests included (see chess-js-ban.js).
    ["src/lib/a.ts", CHESS_JS, ["ban/chess-js"]],
    ["src/lib/a.test.ts", CHESS_JS, ["ban/chess-js"]],
    ["src/lib/__tests__/a.ts", CHESS_JS, ["ban/chess-js"]],
    // next-intl hooks: everywhere under src/ except the wrappers; type-only
    // imports allowed.
    ["src/components/a.tsx", INTL_HOOKS, ["ban/client-intl-hooks"]],
    ["src/components/a.test.tsx", INTL_HOOKS, ["ban/client-intl-hooks"]],
    ["src/i18n/use-safe-translations.ts", INTL_HOOKS, []],
    ["src/i18n/use-safe-locale.ts", INTL_HOOKS, []],
    ["src/components/a.tsx", INTL_HOOKS_TYPE_ONLY, []],
    // hover:underline: src/app/ only, minus admin/ and link-classes.ts.
    ["src/app/[locale]/a.tsx", HOVER_UNDERLINE, ["ban/hover-underline"]],
    ["src/app/[locale]/a.test.tsx", HOVER_UNDERLINE, ["ban/hover-underline"]],
    ["src/app/admin/a.tsx", HOVER_UNDERLINE, []],
    ["src/app/[locale]/_lib/link-classes.ts", HOVER_UNDERLINE, []],
    ["src/components/a.tsx", HOVER_UNDERLINE, []],
    // The collision: one file tripping every ban reports every ban.
    [
      "src/app/[locale]/a.tsx",
      combine(...ALL),
      [
        "ban/chess-js",
        "ban/client-intl-hooks",
        "ban/hover-underline",
        "ban/revalidate-path",
      ],
    ],
    // ...and the revalidatePath test exemption lifts only that ban.
    [
      "src/app/[locale]/a.test.tsx",
      combine(...ALL),
      ["ban/chess-js", "ban/client-intl-hooks", "ban/hover-underline"],
    ],
  ],
  "apps/mobile": [
    ["src/a.ts", CHESS_JS, ["ban/chess-js"]],
    ["src/a.test.ts", CHESS_JS, ["ban/chess-js"]],
    // The apps/web bans do not reach mobile.
    ["src/a.tsx", combine(REVALIDATE_PATH, INTL_HOOKS, HOVER_UNDERLINE), []],
  ],
  "packages/features": [
    ["src/route-planner/a.ts", CHESS_JS, ["ban/chess-js"]],
    ["src/route-planner/__tests__/a.test.ts", CHESS_JS, ["ban/chess-js"]],
    ["src/chess-core/a.ts", CHESS_JS, []],
    ["src/chess-core/__tests__/a.test.ts", CHESS_JS, []],
  ],
};

// One disable per ban, in a file where that ban fires.
const DISABLE_CASES = {
  "apps/web": [
    ["src/lib/a.ts", REVALIDATE_PATH, "ban/revalidate-path"],
    ["src/lib/a.ts", CHESS_JS, "ban/chess-js"],
    ["src/components/a.tsx", INTL_HOOKS, "ban/client-intl-hooks"],
    ["src/app/[locale]/a.tsx", HOVER_UNDERLINE, "ban/hover-underline"],
  ],
  "apps/mobile": [["src/a.ts", CHESS_JS, "ban/chess-js"]],
  "packages/features": [["src/route-planner/a.ts", CHESS_JS, "ban/chess-js"]],
};

for (const [pkg, cases] of Object.entries(CASES)) {
  for (const { label, cwd, prefix } of configsFor(pkg)) {
    describe(`${pkg} bans (${label})`, () => {
      for (const [file, code, expected] of cases) {
        const name = expected.length ? expected.join(" + ") : "nothing";
        it(`${file}: reports ${name}`, async () => {
          const { bans } = await lint(cwd, `${prefix}${file}`, code);
          assert.deepEqual(bans, expected);
        });
      }

      for (const [file, code, rule] of DISABLE_CASES[pkg]) {
        it(`${file}: a ${rule} disable is consumed`, async () => {
          const result = await lint(
            cwd,
            `${prefix}${file}`,
            disabled(code, rule),
          );
          assert.deepEqual(result, { bans: [], unused: [] });
        });
      }
    });
  }
}

describe("the repo's own ban disables", () => {
  const files = execFileSync(
    "git",
    ["grep", "-l", "eslint-disable-next-line ban/", "--", "apps", "packages"],
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter((f) => /\.(ts|tsx)$/.test(f));

  it("exist (the grep found the annotated sites)", () => {
    assert.ok(files.length > 0);
  });

  const byPkg = Object.groupBy(files, (f) => f.split("/").slice(0, 2).join("/"));
  for (const [pkg, pkgFiles] of Object.entries(byPkg)) {
    for (const { label, cwd } of configsFor(pkg)) {
      it(`${pkg}: none is unused (${label})`, async () => {
        const results = await eslintFor(cwd).lintFiles(
          pkgFiles.map((f) => path.join(REPO_ROOT, f)),
        );
        const unused = results.flatMap((r) =>
          r.messages
            .filter((m) => UNUSED_DIRECTIVE.test(m.message))
            .map(
              (m) => `${path.relative(REPO_ROOT, r.filePath)}:${m.line}`,
            ),
        );
        assert.deepEqual(unused, []);
      });
    }
  }
});

describe("ban modules", () => {
  // Every ban's config objects may set only its own `ban/*` rule. Setting a
  // shared rule name (`no-restricted-imports`, `no-restricted-syntax`, ...)
  // from a ban is what made bans overwrite each other.
  const BANS = {
    "ban/revalidate-path": revalidatePathBan,
    "ban/chess-js": chessJsBan,
    "ban/client-intl-hooks": clientIntlHooksBan,
    "ban/hover-underline": hoverUnderlineBan,
  };
  for (const [rule, ban] of Object.entries(BANS)) {
    it(`${rule}: its configs set only ${rule}`, () => {
      const ruleNames = new Set(
        ban().flatMap((config) => Object.keys(config.rules ?? {})),
      );
      assert.deepEqual([...ruleNames], [rule]);
    });
  }
});
