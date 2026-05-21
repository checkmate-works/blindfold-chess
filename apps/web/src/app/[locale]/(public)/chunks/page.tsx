import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getChunkLikeMetaMap } from '@/lib/chunks/like-queries';
import { countChunks, listChunksWithProfile } from '@/lib/chunks/queries';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: resolveTitle('Chunks', locale),
    ...generateCanonicalMetadata({
      locale,
      path: 'chunks',
      title: 'Chunks',
    }),
  };
}

export default async function ChunksListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [user, totalCount, t, tTopicChunks] = await Promise.all([
    getOptionalUser(),
    countChunks({ includeDeleted: false }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'topics.chunks' }),
  ]);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listChunksWithProfile({ includeDeleted: false, limit, offset });

  // Two parallel polymorphic lookups:
  //   - likes are keyed on chunk.id (`targetType='chunk', targetId=id`)
  //   - reply meta is keyed on chunk.slug (the chunk's discussion thread
  //     uses `topicType='chunk', topicKey=slug`)
  const chunkIds = rows.map((r) => r.chunk.id);
  const chunkSlugs = rows.map((r) => r.chunk.slug);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getChunkLikeMetaMap(chunkIds, user?.id),
    getReplyMetaMap('chunk', chunkSlugs),
  ]);

  const justNowLabel = tTopicChunks('justNow');

  return (
    <PageLayout title="Chunks" locale={locale} breadcrumb={[{ label: 'Chunks' }]}>
      <SectionTitle>{t('listSubtitle')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('list.empty')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ chunk, profile }) => (
            <CatalogListCard
              key={chunk.id}
              id={chunk.id}
              fen={chunk.representativeFen}
              title={chunk.title}
              description={chunk.description}
              createdAt={chunk.createdAt}
              profile={profile}
              likeMeta={likeMetaMap.get(chunk.id) ?? { likeCount: 0, likedByMe: false }}
              replyMeta={replyMetaMap.get(chunk.slug) ?? EMPTY_REPLY_META}
              detailHref={`/chunks/${chunk.slug}`}
              i18nNamespace="topics.chunks"
              toggleLikeAction={toggleLike}
              justNowLabel={justNowLabel}
              locale={locale}
              topicKey={chunk.id}
              badge={
                chunk.status === 'draft' ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                    {t('statusDraft')}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={(p) => `/${locale}/chunks?page=${p}`}
        />
      )}

      {user && (
        <div className="py-4">
          <Link href="/chunks/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('list.newCta')}
            </Button>
          </Link>
        </div>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
