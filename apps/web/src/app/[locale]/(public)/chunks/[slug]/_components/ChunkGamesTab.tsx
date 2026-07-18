import { getTranslations } from 'next-intl/server';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ChunkDetailData } from '../_lib/load-chunk-detail';
import { EMPTY_REPLY_META } from '../_lib/load-chunk-detail';
import { RelatedGamesList } from './RelatedGamesList';

/**
 * The Games tab panel of the chunk detail page: the publicly-visible games
 * linking this chunk, rendered via RelatedGamesList. Server component —
 * fetches only the translations it renders.
 */
export async function ChunkGamesTab({
  locale,
  games,
  likeMetaMap,
  replyMetaMap,
}: {
  locale: Locale;
  games: ChunkDetailData['relatedGames'];
  likeMetaMap: ChunkDetailData['relatedGamesLikeMetaMap'];
  replyMetaMap: ChunkDetailData['relatedGamesReplyMetaMap'];
}) {
  const [t, tChunks, tSharedGames, tPlay, tOpeningNames, tHome] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'sharedGames' }),
    getTranslations({ locale, namespace: 'play' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    getTranslations({ locale, namespace: 'home.gameList' }),
  ]);

  return (
    <>
      {games.length > 0 && (
        <p className="text-sm text-muted-foreground">{tChunks('detail.relatedGamesDescription')}</p>
      )}
      <RelatedGamesList
        games={games}
        likeMetaMap={likeMetaMap}
        replyMetaMap={replyMetaMap}
        emptyReplyMeta={EMPTY_REPLY_META}
        locale={locale}
        justNowLabel={tSharedGames('detail.justNow')}
        colorLabels={{
          white: tPlay('playerColor.white'),
          black: tPlay('playerColor.black'),
        }}
        resolveOpeningName={(slug, fallbackName) =>
          getOpeningDisplayName(tOpeningNames, slug, fallbackName)
        }
        emptyLabel={t('relatedGames.empty')}
        moveLabel={(n) => t('relatedGames.moveLabel', { n })}
        newGameLabel={tHome('newGame')}
      />
    </>
  );
}
