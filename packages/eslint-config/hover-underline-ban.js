/**
 * Lint-ban on a bare `hover:underline` in class strings under apps/web/src/app.
 *
 * A link whose only affordance is a hover-time underline is invisible as a
 * link on a touch screen: hover never fires there, so the text is
 * indistinguishable from the copy around it. The shared treatment in
 * `apps/web/src/app/[locale]/_lib/link-classes.ts` underlines at rest and
 * adds a focus ring; its TSDoc also says where an underline is NOT wanted
 * (a label inside a clickable card, a navigation list). Sites that sit in
 * one of those exceptions and still want a pointer-only underline keep it
 * behind an `eslint-disable` that names the exception — the disable is the
 * record of the decision.
 *
 * The admin tree is exempt: it is driven from a desktop, so hover is real
 * there and the rule would only generate disables.
 *
 * Only string and template literals are inspected (`Literal`,
 * `TemplateElement`), so a class assembled from the shared constants never
 * trips it — the constants live in `link-classes.ts`, which is excluded
 * because `CARD_PERMALINK_CLASSES` is the one deliberate hover-only case.
 *
 * Defined once here because, like `revalidate-path-ban`, the rule must be
 * active in BOTH configs that lint apps/web files: `apps/web/eslint.config.mjs`
 * (editor / `pnpm lint`, cwd apps/web) and the repo-root `eslint.config.mjs`
 * (lint-staged pre-commit, cwd root). Without it in the root config,
 * `eslint --fix` on commit would strip the reason-annotated disables as
 * unused directives.
 *
 * @param {string} prefix - file-glob prefix to scope the entries when linting
 *   from a cwd above apps/web (pass `'apps/web/'` in the root config).
 */
export function hoverUnderlineBan(prefix = "") {
  const message =
    "A hover-only underline is invisible on touch screens, where the link then reads as plain text. Use TEXT_LINK_CLASSES / TEXT_LINK_MUTED_CLASSES from '@/app/[locale]/_lib/link-classes' (underline at rest + focus ring). If this sits in a navigation list or inside a clickable card — see that module's TSDoc — eslint-disable this line and say which.";

  return [
    {
      files: [`${prefix}src/app/**/*.{ts,tsx}`],
      ignores: [
        `${prefix}src/app/admin/**`,
        `${prefix}src/app/**/link-classes.ts`,
      ],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "Literal[value=/hover:underline/]",
            message,
          },
          {
            selector: "TemplateElement[value.raw=/hover:underline/]",
            message,
          },
        ],
      },
    },
  ];
}
