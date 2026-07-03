import { getTranslations } from 'next-intl/server';

import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';

import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { togglePositionLike } from '../_actions/togglePositionLike';
import { EMPTY_REPLY_META } from '../_lib/load-chunk-detail';
import type { ChunkDetailData } from '../_lib/load-chunk-detail';

/**
 * The Positions tab panel of the chunk detail page: the linked positions
 * rendered as list cards with their puzzle / memory badges, or the empty
 * placeholder. Server component — fetches only the translations it renders.
 */
export async function ChunkPositionsTab({
  locale,
  linkedPositions,
  likeMetaMap,
  replyMetaMap,
}: {
  locale: Locale;
  linkedPositions: ChunkDetailData['linkedPositions'];
  likeMetaMap: ChunkDetailData['linkedLikeMetaMap'];
  replyMetaMap: ChunkDetailData['linkedReplyMetaMap'];
}) {
  const [tChunks, tPuzzle, tMemory] = await Promise.all([
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
  ]);

  if (linkedPositions.length === 0) {
    return <p className="text-sm text-muted-foreground">{tChunks('detail.positionsEmpty')}</p>;
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{tChunks('detail.positionsDescription')}</p>
      <div className="space-y-3">
        {linkedPositions.map(({ position, profile }) => {
          const positionType = parsePositionType(position.type);
          const detailPath = positionType ? getPositionDetailPath(positionType, position.id) : null;
          if (!detailPath) return null;

          const isPuzzle = position.type === 'puzzle';
          return (
            <PositionListCard
              key={position.id}
              position={position}
              profile={profile}
              likeMeta={likeMetaMap.get(position.id) ?? { likeCount: 0, likedByMe: false }}
              replyMeta={replyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
              detailHref={detailPath}
              i18nNamespace={isPuzzle ? 'practice.puzzle' : 'practice.positionMemory'}
              toggleLikeAction={togglePositionLike}
              justNowLabel={isPuzzle ? tPuzzle('justNow') : tMemory('justNow')}
              locale={locale}
              badge={
                <span
                  className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    isPuzzle
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}
                >
                  {isPuzzle
                    ? tChunks('detail.positionBadge.puzzle')
                    : tChunks('detail.positionBadge.memory')}
                </span>
              }
            />
          );
        })}
      </div>
    </>
  );
}
