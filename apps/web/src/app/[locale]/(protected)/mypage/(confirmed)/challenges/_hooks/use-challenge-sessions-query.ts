import { useEffect, useState } from 'react';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { getAvailableMenuTypes, getChallengeSessions } from '../_actions/get-challenge-sessions';
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
 * Owns the data-fetching lifecycle for the mypage challenges dashboard:
 *
 *   1. Whenever `selectedPeriod` changes (including on mount), fetch the menu
 *      types that have records in that period to populate the dropdown, then
 *      reconcile `selectedMenu`: keep it if still available, otherwise select
 *      the first (or clear it when the period has no records at all).
 *   2. Whenever `selectedMenu` or `selectedPeriod` changes, fetch the current
 *      and previous period's sessions.
 *   3. Callers are notified via `onSessionsLoaded` when a successful fetch
 *      completes, so they can derive piece-filter defaults without this
 *      hook needing to know about them.
 */
export function useChallengeSessionsQuery(
  selectedPeriod: DatePeriod,
  onSessionsLoaded?: (menu: ChallengeMenuType, sessions: ChallengeResultRow[]) => void
): ChallengeSessionsQueryResult {
  const [allSessions, setAllSessions] = useState<ChallengeResultRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<ChallengeResultRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ChallengeMenuType | null>(null);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<ChallengeMenuType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refetch the available menu types whenever the period changes so the
  // dropdown only lists categories that have records in the selected period.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const range = getPeriodRange(selectedPeriod);
      const types = await getAvailableMenuTypes(range.start.toISOString(), range.end.toISOString());
      if (cancelled) return;
      setAvailableMenuTypes(types);
      // Keep the current selection if it still has records in this period;
      // otherwise fall back to the first available (or clear when empty).
      setSelectedMenu((prev) => (prev && types.includes(prev) ? prev : (types[0] ?? null)));
      if (types.length === 0) {
        setAllSessions([]);
        setPreviousSessions([]);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  // Fetch sessions when menu or period changes
  useEffect(() => {
    if (!selectedMenu) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const currentRange = getPeriodRange(selectedPeriod);
      const previousRange = getPreviousPeriodRange(selectedPeriod);

      const response = await getChallengeSessions(
        selectedMenu,
        currentRange.start.toISOString(),
        currentRange.end.toISOString(),
        previousRange.start.toISOString(),
        previousRange.end.toISOString()
      );
      if (!cancelled && response.success) {
        setAllSessions(response.sessions);
        setPreviousSessions(response.previousSessions);
        onSessionsLoaded?.(selectedMenu, response.sessions);
      }
      if (!cancelled) setIsLoading(false);
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
