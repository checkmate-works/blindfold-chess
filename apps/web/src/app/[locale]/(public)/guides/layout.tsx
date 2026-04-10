import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Guides subtree layout.
 *
 * Supplies {@link GamePreferencesProvider} so that the chess-board visual aids
 * rendered inside rank guides (CoordinateBoard, AnchorPointsBoard, etc.) can
 * read the user's board theme via `useGamePreferences` / `useBoardTheme`.
 *
 * This mirrors the per-subtree Provider mounting pattern used by sibling
 * layouts (`ranks/layout.tsx`, `learn/layout.tsx`, `topics/layout.tsx`,
 * `preferences/layout.tsx`, etc.). Each route subtree that renders board
 * visual aids wraps its children in the provider; there is intentionally no
 * single global mount at the `(public)` or `[locale]` layer.
 */
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
