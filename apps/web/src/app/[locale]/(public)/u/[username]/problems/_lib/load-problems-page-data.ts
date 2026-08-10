import { type ReplyMeta, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import type { Position } from '@/lib/db/schema';
import { resolvePagination } from '@/lib/pagination';
import { type PositionLikeMeta, getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositions } from '@/lib/positions/queries';

type ProblemType = 'puzzle' | 'memory';

export type ProblemsPageData = {
  positions: Position[];
  likeMetaMap: Map<string, PositionLikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  puzzleCount: number;
  memoryCount: number;
  currentPage: number;
  totalPages: number;
};

/**
 * Loads a single problem type's page for `/problems/puzzles` or
 * `/problems/position-memory`. Both type counts are fetched (not just the
 * active one) so `ProblemTypeTabs` can show badge counts for the sibling tab
 * too.
 */
export async function loadProblemsPageData({
  profileId,
  currentUserId,
  type,
  page,
  pageSize,
}: {
  profileId: string;
  currentUserId: string | undefined;
  type: ProblemType;
  page: number;
  pageSize: number;
}): Promise<ProblemsPageData> {
  const [puzzleCount, memoryCount] = await Promise.all([
    countPositions({ userId: profileId, type: 'puzzle' }),
    countPositions({ userId: profileId, type: 'memory' }),
  ]);

  const totalForType = type === 'puzzle' ? puzzleCount : memoryCount;
  const { currentPage, totalPages, offset } = resolvePagination(page, totalForType, pageSize);

  const positions = await listPositions({
    userId: profileId,
    type,
    limit: pageSize,
    offset,
  });

  const ids = positions.map((p) => p.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getPositionLikeMetaMap(ids, currentUserId),
    getReplyMetaMap(type === 'puzzle' ? 'position_puzzle' : 'position_memory', ids),
  ]);

  return {
    positions,
    likeMetaMap,
    replyMetaMap,
    puzzleCount,
    memoryCount,
    currentPage,
    totalPages,
  };
}
