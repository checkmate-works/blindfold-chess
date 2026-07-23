import {
  type DailyCreationCapStatus,
  type PointBalanceSummary,
  type PointHistoryEntry,
  getDailyCreationCapStatus,
  getPointBalanceSummary,
  getPointHistory,
} from '@/lib/points';

import { resolveHistoryLinks } from './resolveHistoryLinks';

const HISTORY_PAGE_SIZE = 50;

/**
 * A history row plus an optional deep link to the UGC that earned it. `href`
 * is present only for a live UGC-creation grant — see {@link resolveHistoryLinks}.
 */
export type PointsHistoryRow = PointHistoryEntry & { href?: string };

export type PointsPageData = {
  balance: PointBalanceSummary;
  history: PointsHistoryRow[];
  hasMore: boolean;
  dailyCap: DailyCreationCapStatus;
};

/**
 * Single batched fetch for the /mypage/coins view. Reads the balance
 * summary, the daily creation-cap status, and the most recent history
 * rows in parallel; the +1 trick (fetch HISTORY_PAGE_SIZE+1 and slice)
 * lets the UI know whether more history exists without an extra count
 * query.
 */
export async function getPointsPageData(userId: string): Promise<PointsPageData> {
  const [balance, historyPlusOne, dailyCap] = await Promise.all([
    getPointBalanceSummary(userId),
    getPointHistory(userId, HISTORY_PAGE_SIZE + 1),
    getDailyCreationCapStatus(userId),
  ]);

  const hasMore = historyPlusOne.length > HISTORY_PAGE_SIZE;
  const historyRows = hasMore ? historyPlusOne.slice(0, HISTORY_PAGE_SIZE) : historyPlusOne;

  // Attach a deep link to the earning UGC for each live creation grant. Only
  // the displayed page is resolved (not the +1 probe row).
  const links = await resolveHistoryLinks(historyRows);
  const history: PointsHistoryRow[] = historyRows.map((row) => {
    const href = links.get(row.id);
    return href ? { ...row, href } : row;
  });

  return { balance, history, hasMore, dailyCap };
}
