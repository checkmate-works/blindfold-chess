/**
 * Lint-ban on next-intl's client hooks in apps/web.
 *
 * Client components go through the wrappers in `apps/web/src/i18n/` instead:
 * `useSafeTranslations` for `useTranslations`, `useSafeLocale` for
 * `useLocale`. Both are drop-in — same signature, same return value. What
 * they add is a guard for the window during HMR in which
 * `NextIntlClientProvider` has been torn down but the subtree below it has
 * already re-rendered. Turbopack does a full reload when `.env.local`
 * changes, and next-intl's own hooks throw on the `undefined` intl context
 * rather than degrading. The wrappers detect that via `IntlAvailableContext`
 * and return a translator that echoes the key, or a locale recovered from the
 * pathname, so the dev overlay stays out of the way.
 *
 * Without the rule this is a coin flip: the banned hook and its wrapper are
 * indistinguishable at the call site, so a new file copies whichever its
 * neighbours use. That is how sixty-seven files ended up on the unprotected
 * `useTranslations`, and separately how four ended up on the unprotected
 * `useLocale`.
 *
 * Server components are unaffected — they use `getTranslations` and
 * `getLocale` from `next-intl/server`, a different module this does not
 * touch. Type imports are allowed: `@/i18n/translator` and
 * `@/lib/i18n/localize-action-error` derive the shape of `t` from
 * `typeof useTranslations`, which erases at compile time and cannot throw at
 * runtime.
 *
 * That exemption is why this uses typescript-eslint's extension rule rather
 * than the core one — the core rule has no `allowTypeImports`. It also keeps
 * the rule name distinct from the core `no-restricted-imports` that
 * `revalidate-path-ban` owns: flat config replaces a rule's options wholesale
 * rather than merging them, so two config objects setting the SAME rule name
 * over the same files would silence whichever came first. The two rules
 * restrict disjoint modules, so nothing is reported twice.
 *
 * Defined once here because, like `revalidate-path-ban`, the rule must be
 * active in BOTH configs that lint apps/web files: `apps/web/eslint.config.mjs`
 * (editor / `pnpm lint`, cwd apps/web) and the repo-root `eslint.config.mjs`
 * (lint-staged pre-commit, cwd root). Without it in the root config,
 * `eslint --fix` on commit would strip a reason-annotated disable as an
 * unused directive.
 *
 * @param {string} prefix - file-glob prefix to scope the entries when linting
 *   from a cwd above apps/web (pass `'apps/web/'` in the root config).
 */
export function clientIntlHooksBan(prefix = "") {
  return [
    {
      files: [`${prefix}src/**/*.{ts,tsx}`],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "next-intl",
                importNames: ["useTranslations", "useLocale"],
                allowTypeImports: true,
                message:
                  "next-intl's useTranslations and useLocale throw when the intl context is undefined, which happens during HMR: Turbopack tears NextIntlClientProvider down on an .env.local change and the subtree re-renders before it is back. Import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations' or { useSafeLocale as useLocale } from '@/i18n/use-safe-locale' — same signatures, and they fall back to echoing the key / reading the locale off the pathname instead of throwing. Server components are unaffected: they use getTranslations and getLocale from 'next-intl/server'.",
              },
            ],
          },
        ],
      },
    },
    {
      // The wrappers are the one place allowed to reach for the hooks they
      // wrap; they are also the only places that can tell the throw is coming.
      files: [
        `${prefix}src/i18n/use-safe-translations.ts`,
        `${prefix}src/i18n/use-safe-locale.ts`,
      ],
      rules: {
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },
  ];
}
