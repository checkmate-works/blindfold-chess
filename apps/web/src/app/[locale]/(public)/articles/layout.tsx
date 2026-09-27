import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = { children: React.ReactNode };

/**
 * Board-theme preferences for the articles subtree, which has no board of
 * its own: the provider is here for the native ad card, whose thumbnail is a
 * board and reads the theme. The same trade the glossary layout makes — a
 * static reading surface pays for the provider so it can carry one card.
 *
 * Written out rather than re-exporting `GamePreferencesLayout` so the
 * provider token stays visible to `game-preferences-coverage.test.ts`.
 */
export default function ArticlesLayout({ children }: Props) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
