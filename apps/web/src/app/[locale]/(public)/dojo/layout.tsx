import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Serves the 'dojo' client dictionary (guides, ranks, dojo hub — see
 * `@/app/[locale]/_lib/i18n-scopes`) and the board-theme preferences for the
 * whole belt-progression namespace.
 *
 * The preferences provider used to live one level down, in `guides/` and
 * `ranks/`, because those were the subtrees that render boards and the hub
 * did not. The hub now carries a native ad card, whose thumbnail is a board,
 * so every page under `/dojo` reads the theme and the provider mounts once
 * here instead of three times. Written out rather than re-exporting
 * `GamePreferencesLayout` so the provider token stays visible to
 * `game-preferences-coverage.test.ts`.
 */
export default async function DojoLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ScopedIntlProvider scope="dojo" locale={locale}>
      <GamePreferencesProvider>{children}</GamePreferencesProvider>
    </ScopedIntlProvider>
  );
}
