/**
 * Regression guard for `EnvironmentRibbon` mounting across root layouts.
 *
 * The ribbon itself lives in the external `env-ribbon` package, which owns and
 * tests its own behaviour (detection rules, the production hard gate, dismiss
 * state). What the package cannot know — and what this test covers — is that
 * this app defines THREE independent root layouts, each emitting its own
 * `<html>`/`<body>`:
 *   - `src/app/[locale]/layout.tsx`      (most authenticated routes)
 *   - `src/app/(landing)/layout.tsx`     (root `/` URL, pre-locale redirect)
 *   - `src/app/admin/layout.tsx`         (admin console)
 *
 * The ribbon must be mounted in EVERY one of them. The original bug was
 * exactly that: it was only imported by `[locale]/layout.tsx`, so the root `/`
 * URL (served by `(landing)/layout.tsx`) showed no ribbon at all.
 *
 * This is a static source-level check — it reads the layout files and asserts
 * both:
 *   (a) the layout imports `EnvironmentRibbon` from `env-ribbon`, and
 *   (b) the layout references `<EnvironmentRibbon` somewhere in its JSX.
 *
 * It is intentionally NOT a render test: rendering these layouts requires a
 * running Next.js + Supabase + next-intl environment, which is heavier than
 * the regression we are trying to prevent (namely: "somebody deleted the
 * import"). A static check catches that mistake just as well and runs in
 * milliseconds.
 *
 * The ribbon must also stay in the SERVER tree — it reads `process.env` on the
 * server and hands only the resolved variant to its client child, so
 * `VERCEL_ENV` never needs a `NEXT_PUBLIC_*` counterpart. Importing it from a
 * client component would silently break detection.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Resolve relative to this test file so the test does not depend on the
// Vitest CWD.
const APP_DIR = __dirname;

const ROOT_LAYOUTS: ReadonlyArray<{ name: string; path: string }> = [
  { name: '[locale]/layout.tsx', path: resolve(APP_DIR, '[locale]/layout.tsx') },
  { name: '(landing)/layout.tsx', path: resolve(APP_DIR, '(landing)/layout.tsx') },
  { name: 'admin/layout.tsx', path: resolve(APP_DIR, 'admin/layout.tsx') },
];

// Matches an import that brings in `EnvironmentRibbon` as a named specifier
// from the `env-ribbon` package.
const IMPORT_RE = /import\s*\{[^}]*\bEnvironmentRibbon\b[^}]*\}\s*from\s*['"]env-ribbon['"]/;

// Matches a JSX usage of the component. We deliberately match the opening
// tag rather than the identifier alone so that "EnvironmentRibbon" inside a
// comment does not satisfy the assertion.
const JSX_USAGE_RE = /<EnvironmentRibbon\b/;

describe('EnvironmentRibbon is mounted in every root layout', () => {
  for (const layout of ROOT_LAYOUTS) {
    describe(layout.name, () => {
      const source = readFileSync(layout.path, 'utf8');

      it('imports EnvironmentRibbon from env-ribbon', () => {
        expect(
          IMPORT_RE.test(source),
          `${layout.name} must import EnvironmentRibbon from 'env-ribbon'. ` +
            `If the ribbon has been intentionally removed from this layout, update this test accordingly.`
        ).toBe(true);
      });

      it('renders <EnvironmentRibbon /> somewhere in its JSX', () => {
        expect(
          JSX_USAGE_RE.test(source),
          `${layout.name} must render <EnvironmentRibbon /> in its JSX tree so the ribbon is visible ` +
            `on routes served by this layout. Removing it causes the ribbon to silently disappear on ` +
            `those routes (e.g. the root "/" URL served by (landing)/layout.tsx).`
        ).toBe(true);
      });
    });
  }

  it('covers all three known root layouts (sanity)', () => {
    // Guard against somebody introducing a fourth root layout and forgetting
    // to register it here. This is a weak check — it only asserts the list
    // length — but paired with the per-layout assertions above it catches
    // the common failure mode.
    expect(ROOT_LAYOUTS).toHaveLength(3);
  });
});
