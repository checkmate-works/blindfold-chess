import { resolvePagination } from '@/lib/pagination';
import {
  type PointBalanceSummary,
  type PointHistoryEntry,
  countPointHistory,
  getPointBalanceSummary,
  getPointHistory,
} from '@/lib/points';

import { resolveHistoryLinks } from './resolveHistoryLinks';

const HISTORY_PAGE_SIZE = 20;

/**
 * A history row plus an optional deep link to what it is about: the UGC that
 * earned a (historical) creation grant, or the game an AI review was bought
 * for. Present only while the target is live — see {@link resolveHistoryLinks}.
 */
export type PointsHistoryRow = PointHistoryEntry & { href?: string };

export type PointsPageData = {
  balance: PointBalanceSummary;
  history: PointsHistoryRow[];
  /** Page actually rendered — `page` clamped into `[1, totalPages]`. */
  currentPage: number;
  totalPages: number;
};

/**
 * Single batched fetch for the /mypage/coins view: the balance summary and
 * one page of history rows.
 *
 * The row count is fetched up front (rather than probing with a
 * `PAGE_SIZE + 1` row) because the view renders a numbered pagination bar,
 * which needs `totalPages` and not just "is there more". `page` is clamped
 * here so an out-of-range `?page=` lands on the last real page instead of an
 * empty table.
 */
export async function getPointsPageData(userId: string, page: number = 1): Promise<PointsPageData> {
  const [balance, totalCount] = await Promise.all([
    getPointBalanceSummary(userId),
    countPointHistory(userId),
  ]);

  const { currentPage, totalPages, offset } = resolvePagination(
    page,
    totalCount,
    HISTORY_PAGE_SIZE
  );

  const historyRows = await getPointHistory(userId, HISTORY_PAGE_SIZE, offset);

  // Attach a deep link to each row that has a live target to point at.
  const links = await resolveHistoryLinks(historyRows);
  const history: PointsHistoryRow[] = historyRows.map((row) => {
    const href = links.get(row.id);
    return href ? { ...row, href } : row;
  });

  return { balance, history, currentPage, totalPages };
}
