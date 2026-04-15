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
 *   1. On mount, fetch `getAvailableMenuTypes()` and auto-select the first.
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

  // Fetch all menu types once on mount to populate dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const types = await getAvailableMenuTypes();
      if (!cancelled) {
        setAvailableMenuTypes(types);
        if (types.length > 0) {
          setSelectedMenu(types[0]);
        } else {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
