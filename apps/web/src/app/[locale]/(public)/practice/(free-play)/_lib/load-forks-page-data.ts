import { getOptionalUser } from '@/lib/auth';
import { getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';

type PositionRows = Awaited<ReturnType<typeof listPositionsWithProfile>>;
type LikeMetaMap = Awaited<ReturnType<typeof getPositionLikeMetaMap>>;
type ReplyMetaMap = Awaited<ReturnType<typeof getReplyMetaMap>>;

/**
 * Data assembly for a position's forks listing: the page of fork rows with
 * their author profiles, the total count / pagination window, and the
 * like/reply meta for the listed rows (skipped with empty maps when the
 * page is empty). Kept out of the page factory so the forks `Page` stays
 * thin wiring like its edit / create siblings, which inject their loaders.
 */
export async function loadForksPageData({
  parentId,
  positionType,
  replyMetaType,
  page,
  pageSize,
}: {
  parentId: string;
  positionType: 'puzzle' | 'memory';
  replyMetaType: Parameters<typeof getReplyMetaMap>[0];
  page: number;
  pageSize: number;
}): Promise<{
  rows: PositionRows;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  likeMetaMap: LikeMetaMap;
  replyMetaMap: ReplyMetaMap;
}> {
  const totalCount = await countPositions({ type: positionType, forkedFromId: parentId });
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    pageSize
  );
  const rows = await listPositionsWithProfile({
    type: positionType,
    forkedFromId: parentId,
    limit,
    offset,
  });

  const currentUser = await getOptionalUser();
  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] =
    positionIds.length > 0
      ? await Promise.all([
          getPositionLikeMetaMap(positionIds, currentUser?.id),
          getReplyMetaMap(replyMetaType, positionIds),
        ])
      : [new Map(), new Map()];

  return { rows, totalCount, currentPage, totalPages, likeMetaMap, replyMetaMap };
}
