import { useCallback, useEffect, useMemo, useRef } from 'react';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { computeAbsoluteChange, computeStats, formatDate } from '../_lib/dashboard-utils';
import { derivePieceSelectionFromSessions } from '../_lib/derive-piece-filter';
import { selectChartData } from '../_lib/select-chart-data';
import type { ChartDataPoint } from '../_lib/select-chart-data';
import { useChallengeSessionsQuery } from './use-challenge-sessions-query';
import { useDashboardFilters } from './use-dashboard-filters';
import type { BoardOrientation } from './use-dashboard-filters';

export { PIECE_TYPES } from '../_lib/derive-piece-filter';
export type { PieceSelection } from '@/app/_components/practice/PieceSelector';
export type { ChartDataPoint } from '../_lib/select-chart-data';

type FilterContext = {
  boardOrientationFilter: BoardOrientation;
  activePiece: string;
};

type SessionFilter = (session: ChallengeResultRow, ctx: FilterContext) => boolean;

/** Menu types that support the board orientation filter UI. */
export const ORIENTATION_FILTER_MENUS = new Set<ChallengeMenuType>(['coordinate_quiz']);

/** Menu types that support the piece selection filter UI. */
export const PIECE_FILTER_MENUS = new Set<ChallengeMenuType>(['legal_moves']);

/**
 * Derives the leaderboard key that corresponds to a board orientation filter value.
 * coordinate_quiz uses boardOrientation as leaderboardKey directly.
 */
const MENU_FILTERS: Partial<Record<ChallengeMenuType, SessionFilter>> = {
  coordinate_quiz: (s, ctx) => {
    return s.leaderboardKey === ctx.boardOrientationFilter;
  },
  legal_moves: (s, ctx) => {
    return s.leaderboardKey === ctx.activePiece;
  },
};

function applyFilters(
  sessions: ChallengeResultRow[],
  selectedMenu: ChallengeMenuType | null,
  ctx: FilterContext
): ChallengeResultRow[] {
  const filter = selectedMenu ? MENU_FILTERS[selectedMenu] : undefined;
  if (!filter) return sessions;
  return sessions.filter((s) => filter(s, ctx));
}

export type TableRow = {
  date: string;
  correctAnswers: string;
  incorrectAnswers: number;
};

const DASHBOARD_TABLE_ROWS = 5;

/**
 * Thin orchestrator that wires together:
 *
 *   - `useChallengeSessionsQuery` — fetching
 *   - `useDashboardFilters`       — UI filter state
 *   - `selectChartData`           — pure chart-data selector
 *   - `computeStats` / `computeAbsoluteChange` — pure stats helpers
 *
 * Public API is preserved byte-for-byte from the previous single-hook
 * implementation so Dashboard/Filters/Results consumers need no changes.
 */
export function useDashboardData(locale: string, initialMenu?: ChallengeMenuType) {
  const {
    selectedPeriod,
    setSelectedPeriod,
    boardOrientationFilter,
    setBoardOrientationFilter,
    pieceFilter,
    setPieceFilter,
    handlePieceSelect,
    resetFilters,
    activePiece,
  } = useDashboardFilters();

  // Track whether piece filter should be derived from session data on next
  // fetch. Set to true when menu changes; consumed (set to false) after
  // derivation in the `onSessionsLoaded` callback.
  const shouldDerivePieceFilter = useRef(true);

  const handleSessionsLoaded = useCallback(
    (menu: ChallengeMenuType, sessions: ChallengeResultRow[]) => {
      if (menu === 'legal_moves' && shouldDerivePieceFilter.current) {
        setPieceFilter(derivePieceSelectionFromSessions(sessions));
        shouldDerivePieceFilter.current = false;
      }
    },
    [setPieceFilter]
  );

  const {
    allSessions,
    previousSessions,
    availableMenuTypes,
    selectedMenu,
    setSelectedMenu,
    isLoading,
  } = useChallengeSessionsQuery(selectedPeriod, handleSessionsLoaded, initialMenu);

  // Reset filters when menu changes
  useEffect(() => {
    resetFilters();
    shouldDerivePieceFilter.current = true;
  }, [selectedMenu, resetFilters]);

  const filterCtx = useMemo<FilterContext>(
    () => ({ boardOrientationFilter, activePiece }),
    [boardOrientationFilter, activePiece]
  );

  const filteredSessions = useMemo(
    () => applyFilters(allSessions, selectedMenu, filterCtx),
    [allSessions, selectedMenu, filterCtx]
  );

  const filteredPreviousSessions = useMemo(
    () => applyFilters(previousSessions, selectedMenu, filterCtx),
    [previousSessions, selectedMenu, filterCtx]
  );

  const currentStats = useMemo(
    () => computeStats(filteredSessions, MISTAKE_LIMIT),
    [filteredSessions]
  );
  const prevStats = useMemo(
    () => computeStats(filteredPreviousSessions, MISTAKE_LIMIT),
    [filteredPreviousSessions]
  );

  const chartData = useMemo<ChartDataPoint[]>(
    () => selectChartData(filteredSessions, filteredPreviousSessions, selectedPeriod, locale),
    [filteredSessions, filteredPreviousSessions, selectedPeriod, locale]
  );

  const hasMoreResults = filteredSessions.length > DASHBOARD_TABLE_ROWS;

  const tableRows = useMemo((): TableRow[] => {
    return filteredSessions.slice(0, DASHBOARD_TABLE_ROWS).map((s) => ({
      date: formatDate(s.createdAt, locale),
      correctAnswers: s.score.toString(),
      incorrectAnswers: s.incorrectAnswers,
    }));
  }, [filteredSessions, locale]);

  const bestScoreComparison = useMemo(
    () => computeAbsoluteChange(currentStats.bestScore, prevStats.bestScore),
    [currentStats.bestScore, prevStats.bestScore]
  );

  const avgScoreComparison = useMemo(
    () => computeAbsoluteChange(currentStats.avgCompletionScore, prevStats.avgCompletionScore),
    [currentStats.avgCompletionScore, prevStats.avgCompletionScore]
  );

  return {
    // State
    selectedMenu,
    setSelectedMenu,
    selectedPeriod,
    setSelectedPeriod,
    boardOrientationFilter,
    setBoardOrientationFilter,
    pieceFilter,
    handlePieceSelect,
    isLoading,
    availableMenuTypes,

    // Computed
    activePiece,
    currentStats,
    bestScoreComparison,
    avgScoreComparison,
    chartData,
    tableRows,
    hasMoreResults,
  };
}
