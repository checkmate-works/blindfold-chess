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
 * A history row plus an optional deep link to the UGC that earned it. `href`
 * is present only for a live (historical) UGC-creation grant — see {@link resolveHistoryLinks}.
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

  // Attach a deep link to the earning UGC for each live creation grant.
  const links = await resolveHistoryLinks(historyRows);
  const history: PointsHistoryRow[] = historyRows.map((row) => {
    const href = links.get(row.id);
    return href ? { ...row, href } : row;
  });

  return { balance, history, currentPage, totalPages };
}
