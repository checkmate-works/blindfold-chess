import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Subtree providers: the 'home' client dictionary (see
 * `@/app/[locale]/_lib/i18n-scopes`) and the board-theme preferences this
 * subtree's boards read. Formerly a bare `GamePreferencesLayout` re-export;
 * the explicit component keeps the provider token visible to
 * `game-preferences-coverage.test.ts`.
 */
export default async function HomeLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ScopedIntlProvider scope="home" locale={locale}>
      <GamePreferencesProvider>{children}</GamePreferencesProvider>
    </ScopedIntlProvider>
  );
}
