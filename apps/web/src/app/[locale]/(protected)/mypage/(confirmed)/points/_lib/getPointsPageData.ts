import {
  type PointBalanceSummary,
  type PointHistoryEntry,
  getPointBalanceSummary,
  getPointHistory,
} from '@/lib/points';

const HISTORY_PAGE_SIZE = 50;

export type PointsPageData = {
  balance: PointBalanceSummary;
  history: PointHistoryEntry[];
  hasMore: boolean;
};

/**
 * Single batched fetch for the /mypage/points view. Reads the balance
 * summary and the most recent history rows in parallel; the +1 trick
 * (fetch HISTORY_PAGE_SIZE+1 and slice) lets the UI know whether more
 * history exists without an extra count query.
 */
export async function getPointsPageData(userId: string): Promise<PointsPageData> {
  const [balance, historyPlusOne] = await Promise.all([
    getPointBalanceSummary(userId),
    getPointHistory(userId, HISTORY_PAGE_SIZE + 1),
  ]);

  const hasMore = historyPlusOne.length > HISTORY_PAGE_SIZE;
  const history = hasMore ? historyPlusOne.slice(0, HISTORY_PAGE_SIZE) : historyPlusOne;

  return { balance, history, hasMore };
}
