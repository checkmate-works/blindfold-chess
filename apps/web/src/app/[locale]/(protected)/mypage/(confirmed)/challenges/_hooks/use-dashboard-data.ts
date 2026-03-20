import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MISTAKE_LIMIT } from '@/lib/challenge-constants';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import {
  type ChallengeResultRow,
  type DatePeriod,
  getAvailableMenuTypes,
  getChallengeSessions,
} from '../_actions/get-challenge-sessions';
import {
  aggregateByDay,
  computePercentChange,
  computeStats,
  formatDate,
  formatShortDate,
  getDayIndex,
  getPeriodStart,
  getPreviousPeriodStart,
} from '../_lib/dashboard-utils';
import {
  DEFAULT_PIECE_SELECTION,
  type PieceSelection,
  derivePieceSelectionFromSessions,
} from '../_lib/derive-piece-filter';
import { getPeriodRange, getPreviousPeriodRange } from '../_lib/period-utils';

export { PIECE_TYPES } from '../_lib/derive-piece-filter';
export type { PieceSelection } from '@/app/_components/practice/PieceSelector';

const PIECE_SHORT_TO_NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

type BoardOrientation = 'white' | 'black' | 'random';

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

const TABLE_MAX_ROWS = 20;

export type ChartDataPoint = {
  date: string;
  score: number | null;
  previousScore: number | null;
};

export function useDashboardData(locale: string) {
  const [allSessions, setAllSessions] = useState<ChallengeResultRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<ChallengeResultRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ChallengeMenuType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('thisWeek');
  const [boardOrientationFilter, setBoardOrientationFilter] = useState<BoardOrientation>('white');
  const [pieceFilter, setPieceFilter] = useState<PieceSelection>(DEFAULT_PIECE_SELECTION);
  const [isLoading, setIsLoading] = useState(true);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<ChallengeMenuType[] | null>(null);

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

  // Track whether piece filter should be derived from session data on next fetch.
  // Set to true when menu changes; consumed (set to false) after derivation.
  const shouldDerivePieceFilter = useRef(true);

  // Reset filters when menu changes
  useEffect(() => {
    setBoardOrientationFilter('white');
    setPieceFilter(DEFAULT_PIECE_SELECTION);
    shouldDerivePieceFilter.current = true;
  }, [selectedMenu]);

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

        // Derive piece filter from session data only on initial load for the menu.
        // Subsequent period changes preserve the user's manual filter adjustments.
        if (selectedMenu === 'legal_moves' && shouldDerivePieceFilter.current) {
          setPieceFilter(derivePieceSelectionFromSessions(response.sessions));
          shouldDerivePieceFilter.current = false;
        }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMenu, selectedPeriod]);

  const handlePieceSelect = useCallback((piece: PieceSelection) => {
    setPieceFilter(piece);
  }, []);

  const activePiece = useMemo(
    () => (pieceFilter === 'random' ? 'random' : (PIECE_SHORT_TO_NAME[pieceFilter] ?? 'random')),
    [pieceFilter]
  );
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

  const chartData = useMemo((): ChartDataPoint[] => {
    const currentDaily = aggregateByDay(filteredSessions, locale);
    const previousDaily = aggregateByDay(filteredPreviousSessions, locale);

    const currentPeriodStart = getPeriodStart(selectedPeriod);
    const prevPeriodStart = getPreviousPeriodStart(selectedPeriod);

    // Build maps keyed by day index (offset from period start)
    const currentByDayIndex = new Map<number, { avgScore: number; dateLabel: string }>();
    for (const cd of currentDaily) {
      const idx = getDayIndex(cd.dateKey, currentPeriodStart);
      currentByDayIndex.set(idx, { avgScore: cd.avgScore, dateLabel: cd.date });
    }

    const prevByDayIndex = new Map<number, number>();
    for (const pd of previousDaily) {
      const idx = getDayIndex(pd.dateKey, prevPeriodStart);
      prevByDayIndex.set(idx, pd.avgScore);
    }

    // Union of day indices from both periods so previous-only days also appear
    const allDayIndices = new Set([...currentByDayIndex.keys(), ...prevByDayIndex.keys()]);
    const sortedIndices = Array.from(allDayIndices).sort((a, b) => a - b);

    return sortedIndices.map((dayIdx) => {
      const current = currentByDayIndex.get(dayIdx);
      const prevScore = prevByDayIndex.get(dayIdx) ?? null;

      // Use existing date label when available, otherwise derive from day index
      let dateLabel: string;
      if (current) {
        dateLabel = current.dateLabel;
      } else {
        const dateForLabel = new Date(currentPeriodStart);
        dateForLabel.setDate(dateForLabel.getDate() + dayIdx);
        dateLabel = formatShortDate(dateForLabel, locale);
      }

      return {
        date: dateLabel,
        score: current?.avgScore ?? null,
        previousScore: prevScore,
      };
    });
  }, [filteredSessions, filteredPreviousSessions, locale, selectedPeriod]);

  // TODO: ページネーション対応
  const tableRows = useMemo((): TableRow[] => {
    return filteredSessions.slice(0, TABLE_MAX_ROWS).map((s) => ({
      date: formatDate(s.createdAt, locale),
      correctAnswers: s.score.toString(),
      incorrectAnswers: s.incorrectAnswers,
    }));
  }, [filteredSessions, locale]);

  const bestScoreComparison = useMemo(
    () => computePercentChange(currentStats.bestScore, prevStats.bestScore),
    [currentStats.bestScore, prevStats.bestScore]
  );

  const avgScoreComparison = useMemo(
    () => computePercentChange(currentStats.avgCompletionScore, prevStats.avgCompletionScore),
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
    currentStats,
    bestScoreComparison,
    avgScoreComparison,
    chartData,
    tableRows,
  };
}
