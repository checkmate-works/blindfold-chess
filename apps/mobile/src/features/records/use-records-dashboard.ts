import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  type ChallengeRecord,
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  computeAbsoluteChange,
  computeStats,
  latestLeaderboardKey,
  selectChartData,
} from "@blindfold-chess/features/challenge-records";
import {
  MISTAKE_LIMIT,
  type ChallengeMenuType,
} from "@blindfold-chess/features/practice-registry";
import type { DatePeriod } from "@blindfold-chess/features/utils";

import { fetchRecordsDashboard, type RecordsDashboard } from "./records-api";

/** How many of the newest runs the dashboard lists, as on the web. */
export const DASHBOARD_HISTORY_ROWS = 5;

/**
 * The key a keyed menu opens on when the period has no run of it to follow:
 * the web's defaults.
 */
function defaultKeyOf(menu: ChallengeMenuType): string | null {
  if (ORIENTATION_FILTER_MENUS.has(menu)) return "white";
  if (PIECE_FILTER_MENUS.has(menu)) return "random";
  return null;
}

function filterByKey(
  sessions: ChallengeRecord[],
  key: string | null,
): ChallengeRecord[] {
  return key === null
    ? sessions
    : sessions.filter((s) => s.leaderboardKey === key);
}

/**
 * The state of My Records: the web's `useDashboardData` for the app.
 *
 * One request per (period, menu) answers both the period's menus and the
 * chosen menu's runs, now and in the period before. `preferredMenu` is the
 * player's own pick and is kept apart from the menu shown
 * (`data.selectedMenu`), which the server reconciles: a period without the
 * picked menu shows its first menu instead, and the pick comes back with a
 * period that has it.
 *
 * A keyed menu (coordinate quiz's orientation, legal moves' piece) shows
 * one key at a time. The key follows the newest run whenever another menu
 * comes up, so a player who only drilled the knight this week does not land
 * on an empty "random"; changing only the period keeps the player's key.
 *
 * The data is read again whenever the screen comes back into view, so a
 * challenge finished in between shows up.
 */
export function useRecordsDashboard(locale: string) {
  const [period, setPeriod] = useState<DatePeriod>("thisWeek");
  const [preferredMenu, setPreferredMenu] = useState<ChallengeMenuType | null>(
    null,
  );
  const [data, setData] = useState<RecordsDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState<string | null>(null);
  const lastLoadedMenu = useRef<ChallengeMenuType | null>(null);

  /**
   * Loads `p` for `menu`. `isCurrent` is asked once the response is in; a
   * response it rejects is dropped, so a slow answer for a period the player
   * has already left cannot overwrite the one they are looking at.
   */
  const load = useCallback(
    async (
      p: DatePeriod,
      menu: ChallengeMenuType | null,
      isCurrent: () => boolean = () => true,
    ) => {
      setLoading(true);
      const result = await fetchRecordsDashboard(p, menu);
      if (!isCurrent()) return;
      setLoading(false);
      if ("error" in result) {
        setFailed(true);
        return;
      }
      setFailed(false);
      const shown = result.selectedMenu;
      if (shown !== lastLoadedMenu.current) {
        lastLoadedMenu.current = shown;
        setKey(
          shown
            ? (latestLeaderboardKey(result.sessions, shown) ??
                defaultKeyOf(shown))
            : null,
        );
      }
      setData(result);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(period, preferredMenu, () => active);
      return () => {
        active = false;
      };
    }, [load, period, preferredMenu]),
  );

  const refresh = useCallback(
    () => load(period, preferredMenu),
    [load, period, preferredMenu],
  );

  const selectedMenu = data?.selectedMenu ?? null;
  const keyFilter =
    selectedMenu && defaultKeyOf(selectedMenu) !== null ? key : null;

  const derived = useMemo(() => {
    const sessions = filterByKey(data?.sessions ?? [], keyFilter);
    const previous = filterByKey(data?.previousSessions ?? [], keyFilter);
    const current = computeStats(sessions, MISTAKE_LIMIT);
    const before = computeStats(previous, MISTAKE_LIMIT);
    return {
      stats: current,
      bestScoreChange: computeAbsoluteChange(
        current.bestScore,
        before.bestScore,
      ),
      avgScoreChange: computeAbsoluteChange(
        current.avgCompletionScore,
        before.avgCompletionScore,
      ),
      chartData: selectChartData(sessions, previous, period, locale),
      history: sessions.slice(0, DASHBOARD_HISTORY_ROWS),
      hasMoreResults: sessions.length > DASHBOARD_HISTORY_ROWS,
    };
  }, [data, keyFilter, period, locale]);

  return {
    period,
    setPeriod,
    /** Picks the menu to show; the server falls back when it has no runs. */
    selectMenu: setPreferredMenu,
    selectedMenu,
    availableMenuTypes: data?.availableMenuTypes ?? null,
    keyFilter,
    setKey,
    loading,
    failed,
    refresh,
    ...derived,
  };
}
