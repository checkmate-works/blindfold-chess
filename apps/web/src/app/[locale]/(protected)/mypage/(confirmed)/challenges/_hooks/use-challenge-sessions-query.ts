import { useEffect, useRef, useState } from 'react';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { getChallengeDashboardData } from '../_actions/get-challenge-sessions';
import type { DatePeriod } from '../_lib/period-utils';
import { getPeriodRange, getPreviousPeriodRange } from '../_lib/period-utils';

export type ChallengeSessionsQueryResult = {
  allSessions: ChallengeResultRow[];
  previousSessions: ChallengeResultRow[];
  availableMenuTypes: ChallengeMenuType[] | null;
  selectedMenu: ChallengeMenuType | null;
  setSelectedMenu: (menu: ChallengeMenuType | null) => void;
  isLoading: boolean;
};

/**
 * Owns the data-fetching lifecycle for the mypage challenges dashboard.
 *
 * Every (period, menu) combination resolves with ONE `getChallengeDashboardData`
 * call: the action returns the period's available menu types AND the sessions
 * of the reconciled selection together. This replaced a two-effect chain
 * (fetch menu types → set selection → fetch sessions) that cost two
 * sequential server round trips on mount and on every period change.
 *
 * Menu reconciliation happens server-side (keep `preferredMenu` if it still
 * has records in the period, else first available, else null). When the
 * server's reconciled menu differs from the client state, adopting it via
 * `setSelectedMenu` re-fires the effect — `lastAppliedKey` marks the
 * (period, menu) pair the applied response already covers, so that re-run
 * is a no-op instead of a duplicate fetch.
 *
 * Callers are notified via `onSessionsLoaded` when a successful fetch
 * completes, so they can derive piece-filter defaults without this hook
 * needing to know about them.
 *
 * `initialMenu` seeds the very first request's `preferredMenu` (a deep link
 * from a practice result page). It goes through the same server-side
 * reconciliation as a user's pick, so a menu with no records in the default
 * period falls back to the first one that has some instead of an empty
 * dashboard.
 */
export function useChallengeSessionsQuery(
  selectedPeriod: DatePeriod,
  onSessionsLoaded?: (menu: ChallengeMenuType, sessions: ChallengeResultRow[]) => void,
  initialMenu?: ChallengeMenuType
): ChallengeSessionsQueryResult {
  const [allSessions, setAllSessions] = useState<ChallengeResultRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<ChallengeResultRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ChallengeMenuType | null>(initialMenu ?? null);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<ChallengeMenuType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastAppliedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${selectedPeriod}:${selectedMenu ?? ''}`;
    // The response that set the current state already covered this exact
    // (period, menu) pair — this run is the echo of adopting the server's
    // reconciled menu, not a user action.
    if (lastAppliedKey.current === key) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const currentRange = getPeriodRange(selectedPeriod);
      const previousRange = getPreviousPeriodRange(selectedPeriod);

      const response = await getChallengeDashboardData(
        selectedMenu ?? undefined,
        currentRange.start.toISOString(),
        currentRange.end.toISOString(),
        previousRange.start.toISOString(),
        previousRange.end.toISOString()
      );
      if (cancelled) return;

      lastAppliedKey.current = `${selectedPeriod}:${response.selectedMenu ?? ''}`;
      setAvailableMenuTypes(response.availableMenuTypes);
      setSelectedMenu(response.selectedMenu);
      setAllSessions(response.sessions);
      setPreviousSessions(response.previousSessions);
      if (response.success && response.selectedMenu) {
        onSessionsLoaded?.(response.selectedMenu, response.sessions);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // onSessionsLoaded is intentionally omitted from deps: callers pass an
    // inline callback and re-invoking on every render would cause refetch
    // loops. The caller must ensure the callback closes over the right state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenu, selectedPeriod]);

  return {
    allSessions,
    previousSessions,
    availableMenuTypes,
    selectedMenu,
    setSelectedMenu,
    isLoading,
  };
}
