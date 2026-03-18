import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PracticeMenuType, PracticeSessionRow } from '@/lib/db/practice-session-types';
import { getSessionScoreFields, isTypedSession } from '@/lib/db/practice-session-types';

import {
  type DatePeriod,
  getAvailableMenuTypes,
  getPracticeSessions,
} from '../_actions/get-practice-sessions';
import {
  aggregateByDay,
  computePercentChange,
  computeStats,
  formatDate,
  getDayIndex,
  getPeriodStart,
  getPreviousPeriodStart,
} from '../_lib/dashboard-utils';
import {
  DEFAULT_PIECE_SELECTION,
  PIECE_TYPES,
  type PieceSelection,
  derivePieceSelectionFromSessions,
} from '../_lib/derive-piece-filter';
import { getPeriodRange, getPreviousPeriodRange } from '../_lib/period-utils';

export { PIECE_TYPES, type PieceSelection } from '../_lib/derive-piece-filter';

type FilterContext = {
  boardOrientationFilter: string;
  activePieces: string[];
};

type SessionFilter = (session: PracticeSessionRow, ctx: FilterContext) => boolean;

/** Menu types that support the board orientation filter UI. */
export const ORIENTATION_FILTER_MENUS = new Set<PracticeMenuType>(['coordinate_quiz']);

/** Menu types that support the piece selection filter UI. */
export const PIECE_FILTER_MENUS = new Set<PracticeMenuType>(['legal_moves']);

/**
 * Data-driven filter definitions per menu type.
 * To add filtering for a new menu type, add an entry here and expose the
 * corresponding UI controls in Dashboard.tsx.
 */
const MENU_FILTERS: Partial<Record<PracticeMenuType, SessionFilter>> = {
  coordinate_quiz: (s, ctx) => {
    if (ctx.boardOrientationFilter === 'all') return true;
    if (isTypedSession(s) && s.menuType === 'coordinate_quiz') {
      return s.settings.boardOrientation === ctx.boardOrientationFilter;
    }
    return true;
  },
  legal_moves: (s, ctx) => {
    if (isTypedSession(s) && s.menuType === 'legal_moves') {
      const sorted = [...s.settings.selectedPieces].sort();
      return (
        sorted.length === ctx.activePieces.length &&
        sorted.every((p, i) => p === ctx.activePieces[i])
      );
    }
    return true;
  },
};

function applyFilters(
  sessions: PracticeSessionRow[],
  selectedMenu: PracticeMenuType | null,
  ctx: FilterContext
): PracticeSessionRow[] {
  const filter = selectedMenu ? MENU_FILTERS[selectedMenu] : undefined;
  if (!filter) return sessions;
  return sessions.filter((s) => filter(s, ctx));
}

export type TableRow = {
  date: string;
  correctAnswers: string;
  incorrectAnswers: number | null;
  mistakeAllowance: number | null;
};

const TABLE_MAX_ROWS = 20;

export type ChartDataPoint = {
  date: string;
  score: number;
  previousScore: number | null;
};

export function useDashboardData(locale: string) {
  const [allSessions, setAllSessions] = useState<PracticeSessionRow[]>([]);
  const [previousSessions, setPreviousSessions] = useState<PracticeSessionRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<PracticeMenuType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('thisWeek');
  const [boardOrientationFilter, setBoardOrientationFilter] = useState<string>('all');
  const [pieceFilter, setPieceFilter] = useState<PieceSelection>(DEFAULT_PIECE_SELECTION);
  const [isLoading, setIsLoading] = useState(true);
  const [availableMenuTypes, setAvailableMenuTypes] = useState<PracticeMenuType[] | null>(null);

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
    setBoardOrientationFilter('all');
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

      const response = await getPracticeSessions(
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

  const activePieces = useMemo(
    () => (pieceFilter === 'random' ? [...PIECE_TYPES].sort() : [pieceFilter]),
    [pieceFilter]
  );
  const filterCtx = useMemo<FilterContext>(
    () => ({ boardOrientationFilter, activePieces: [...activePieces] }),
    [boardOrientationFilter, activePieces]
  );

  const filteredSessions = useMemo(
    () => applyFilters(allSessions, selectedMenu, filterCtx),
    [allSessions, selectedMenu, filterCtx]
  );

  const filteredPreviousSessions = useMemo(
    () => applyFilters(previousSessions, selectedMenu, filterCtx),
    [previousSessions, selectedMenu, filterCtx]
  );

  const currentStats = useMemo(() => computeStats(filteredSessions), [filteredSessions]);
  const prevStats = useMemo(
    () => computeStats(filteredPreviousSessions),
    [filteredPreviousSessions]
  );

  const chartData = useMemo((): ChartDataPoint[] => {
    const currentDaily = aggregateByDay(filteredSessions, locale);
    const previousDaily = aggregateByDay(filteredPreviousSessions, locale);

    const currentPeriodStart = getPeriodStart(selectedPeriod);
    const prevPeriodStart = getPreviousPeriodStart(selectedPeriod);

    const prevByDayIndex = new Map<number, number>();
    for (const pd of previousDaily) {
      const idx = getDayIndex(pd.dateKey, prevPeriodStart);
      prevByDayIndex.set(idx, pd.avgScore);
    }

    return currentDaily.map((cd) => {
      const dayIdx = getDayIndex(cd.dateKey, currentPeriodStart);
      const prevScore = prevByDayIndex.get(dayIdx) ?? null;
      return {
        date: cd.date,
        score: cd.avgScore,
        previousScore: prevScore,
      };
    });
  }, [filteredSessions, filteredPreviousSessions, locale, selectedPeriod]);

  // TODO: ページネーション対応
  const tableRows = useMemo((): TableRow[] => {
    return filteredSessions.slice(0, TABLE_MAX_ROWS).map((s) => {
      const fields = getSessionScoreFields(s);
      return {
        date: formatDate(s.startedAt, locale),
        correctAnswers: fields ? `${fields.correctAnswers}` : '-',
        incorrectAnswers: fields ? fields.incorrectAnswers : null,
        mistakeAllowance: fields ? fields.mistakeAllowance : null,
      };
    });
  }, [filteredSessions, locale]);

  const bestScoreComparison = useMemo(
    () => computePercentChange(currentStats.bestScore, prevStats.bestScore),
    [currentStats.bestScore, prevStats.bestScore]
  );

  const avgScoreComparison = useMemo(
    () => computePercentChange(currentStats.avgCompletionScore, prevStats.avgCompletionScore),
    [currentStats.avgCompletionScore, prevStats.avgCompletionScore]
  );

  const totalSessionsChange = useMemo(
    () =>
      prevStats.totalSessions > 0 ? currentStats.totalSessions - prevStats.totalSessions : null,
    [currentStats.totalSessions, prevStats.totalSessions]
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
    totalSessionsChange,
    chartData,
    tableRows,
  };
}
