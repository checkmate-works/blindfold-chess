import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
