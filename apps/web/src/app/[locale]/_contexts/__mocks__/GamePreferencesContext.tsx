import type { ReactNode } from 'react';

import { makeGamePreferences } from '../__test-support__/preferences-fixture';

/**
 * `useGamePreferences` answering with the test fixture, already loaded.
 *
 * Opt in with a bare `vi.mock('@/app/[locale]/_contexts/GamePreferencesContext')`.
 *
 * Five puzzle-authoring suites declared this same factory — the fixture from
 * `makeGamePreferences()`, both loaded flags true, inert setters — because a
 * `vi.mock` factory cannot be shared as a plain helper. A suite whose subject
 * is a *particular* preference (a peek board, a hidden side) keeps its own
 * factory: which values it stubs is the specification of that test.
 *
 * The provider is exported as a pass-through so a tree that happens to mount
 * it still renders its children.
 */
export function useGamePreferences() {
  return {
    preferences: makeGamePreferences(),
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  };
}

export function GamePreferencesProvider({ children }: { children: ReactNode }) {
  return children;
}
