import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function GamePreferencesLayout({ children }: { children: React.ReactNode }) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
