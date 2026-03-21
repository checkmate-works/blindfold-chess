import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
