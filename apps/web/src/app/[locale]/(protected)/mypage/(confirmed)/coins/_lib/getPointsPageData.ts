import {
  type DailyCreationCapStatus,
  type PointBalanceSummary,
  type PointHistoryEntry,
  getDailyCreationCapStatus,
  getPointBalanceSummary,
  getPointHistory,
} from '@/lib/points';

const HISTORY_PAGE_SIZE = 50;

export type PointsPageData = {
  balance: PointBalanceSummary;
  history: PointHistoryEntry[];
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
  const history = hasMore ? historyPlusOne.slice(0, HISTORY_PAGE_SIZE) : historyPlusOne;

  return { balance, history, hasMore, dailyCap };
}
