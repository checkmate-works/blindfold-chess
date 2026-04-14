import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Shared subtree layout that supplies {@link GamePreferencesProvider}.
 *
 * Chess-board visual aids (CoordinateBoard, AnchorPointsBoard,
 * KingMovementBoard, etc.) read the user's board theme via
 * `useGamePreferences` / `useBoardTheme`, so any route subtree that renders
 * those components must be wrapped in this provider.
 *
 * The codebase uses a **per-subtree** mounting pattern: each feature area
 * (`ranks/`, `learn/`, `topics/`, `preferences/`, `guides/`, `u/[username]/`,
 * `practice/`, `games/`, `(home)/`, ...) owns a thin `layout.tsx` that
 * re-exports `GamePreferencesLayout` as its default. There is intentionally
 * no single global mount at the `[locale]` or `(public)` layer — static
 * informational routes (`/privacy`, `/terms`, `/faq`, ...) have no need for
 * the provider and should not pay its client-boundary cost.
 *
 * To add the provider to a new subtree, create `layout.tsx` with:
 *
 * ```ts
 * export { GamePreferencesLayout as default } from '@/app/_layouts/game-preferences-layout';
 * ```
 *
 * If the subtree needs additional layout markup (e.g. a PageTitle), wrap
 * manually with `<GamePreferencesProvider>` instead — see
 * `onboarding/layout.tsx` for an example.
 */
export function GamePreferencesLayout({ children }: { children: React.ReactNode }) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
