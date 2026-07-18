import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { FaPlus } from 'react-icons/fa';

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
  chunkSlug,
  linkedPositions,
  likeMetaMap,
  replyMetaMap,
}: {
  locale: Locale;
  chunkSlug: string;
  linkedPositions: ChunkDetailData['linkedPositions'];
  likeMetaMap: ChunkDetailData['linkedLikeMetaMap'];
  replyMetaMap: ChunkDetailData['linkedReplyMetaMap'];
}) {
  const [tChunks, tPuzzle, tMemory, tCreate] = await Promise.all([
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
    getTranslations({ locale, namespace: 'sharedGames.create' }),
  ]);

  if (linkedPositions.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{tChunks('detail.positionsEmpty')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}/practice/position-memory/new?chunk=${chunkSlug}`}>
            <Button variant="outline" size="sm" icon={<FaPlus className="h-3 w-3" />}>
              {tCreate('positionMemory')}
            </Button>
          </Link>
          <Link href={`/${locale}/practice/puzzle/new?chunk=${chunkSlug}`}>
            <Button variant="outline" size="sm" icon={<FaPlus className="h-3 w-3" />}>
              {tCreate('puzzle')}
            </Button>
          </Link>
        </div>
      </div>
    );
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
