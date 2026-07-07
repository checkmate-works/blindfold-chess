import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getChunkLikeMetaMap } from '@/lib/chunks/like-queries';
import {
  countChunks,
  getFeedbackTopicsForChunks,
  listChunksWithProfile,
} from '@/lib/chunks/queries';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { TopicTabs } from '@/app/[locale]/(public)/topics/_components/TopicTabs';
import { TopicTabsSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicTabsSkeleton';
import {
  HelpTourButton,
  PageLayout,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.chunks', path: 'chunks' });
}

type FilterKey = 'all' | 'drafts' | 'published';

const FILTER_KEYS: readonly FilterKey[] = ['all', 'drafts', 'published'];

function parseFilter(raw: string | string[] | undefined): FilterKey {
  return typeof raw === 'string' && (FILTER_KEYS as readonly string[]).includes(raw)
    ? (raw as FilterKey)
    : 'all';
}

function filterToStatus(filter: FilterKey): ChunkStatus | undefined {
  if (filter === 'drafts') return 'draft';
  if (filter === 'published') return 'published';
  return undefined;
}

async function ChunksListContent({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const filter = parseFilter(sp.filter);
  const statusFilter = filterToStatus(filter);

  // Filter chips show counts for both branches alongside the active
  // selection. Load them in parallel with the filtered list — three
  // small COUNT(*)s on a public catalog are cheap enough to do every
  // page load, and lets the chip labels stay accurate after every
  // publish / new-draft transition without revalidation gymnastics.
  const [user, totalCount, draftCount, publishedCount, t, tTopicChunks] = await Promise.all([
    getOptionalUser(),
    countChunks({ includeDeleted: false, status: statusFilter }),
    countChunks({ includeDeleted: false, status: 'draft' }),
    countChunks({ includeDeleted: false, status: 'published' }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'topics.chunks' }),
  ]);
  const allCount = draftCount + publishedCount;
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listChunksWithProfile({
    includeDeleted: false,
    status: statusFilter,
    limit,
    offset,
  });

  // Three parallel polymorphic lookups:
  //   - likes are keyed on chunk.id (`targetType='chunk', targetId=id`)
  //   - reply meta is keyed on chunk.slug (the chunk's discussion thread
  //     uses `topicType='chunk', topicKey=slug`)
  //   - feedback topics are draft-only signals — drafts on the list get
  //     extra chips showing which fields the author flagged for input
  const chunkIds = rows.map((r) => r.chunk.id);
  const chunkSlugs = rows.map((r) => r.chunk.slug);
  const draftChunkIds = rows.filter((r) => r.chunk.status === 'draft').map((r) => r.chunk.id);
  const [likeMetaMap, replyMetaMap, feedbackTopicsByChunk] = await Promise.all([
    getChunkLikeMetaMap(chunkIds, user?.id),
    getReplyMetaMap('chunk', chunkSlugs),
    draftChunkIds.length > 0
      ? getFeedbackTopicsForChunks(draftChunkIds)
      : Promise.resolve(new Map<string, ChunkFeedbackTopic[]>()),
  ]);

  const justNowLabel = tTopicChunks('justNow');

  const filterChipClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
    }`;
  const filterCountClass = (active: boolean) =>
    `inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-medium ${
      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
    }`;
  const buildFilterHref = (next: FilterKey) =>
    next === 'all' ? `/chunks` : (`/chunks?filter=${next}` as '/chunks');

  // Help-tour steps: explain what this catalog is and (if signed in)
  // point at the create CTA. The CTA is only rendered for signed-in
  // users, so the second step is suppressed otherwise to avoid the
  // tour pointing at a missing element.
  const helpSteps: HelpStep[] = [
    {
      targetId: 'chunks-list-intro',
      title: t('list.help.catalog.title'),
      description: t('list.help.catalog.description'),
      side: 'bottom',
      align: 'start',
    },
    ...(user
      ? [
          {
            targetId: 'chunks-list-create',
            title: t('list.help.create.title'),
            description: t('list.help.create.description'),
            side: 'top' as const,
            align: 'center' as const,
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      title={t('listTitle')}
      titleAction={<HelpTourButton steps={helpSteps} label={t('list.help.label')} />}
      locale={locale}
      breadcrumb={[{ label: t('listTitle') }]}
    >
      <div data-tour-id="chunks-list-intro">
        <SectionTitle>{t('listSubtitle')}</SectionTitle>
      </div>

      <div className="mb-6">
        <TopicTabs active="chunks" locale={locale} />
      </div>

      {/*
       * Filter chips. "All" is the default landing tab; "Drafts"
       * makes it discoverable that some chunks are still in
       * workshop / accepting suggestions; "Published" is the
       * canonical catalog. The active chip uses the primary colour
       * to match other selected-state pills in the app.
       */}
      <nav className="flex flex-wrap gap-2" aria-label={t('list.filterAriaLabel')}>
        <Link href={buildFilterHref('all')} className={filterChipClass(filter === 'all')}>
          <span>{t('list.filter.all')}</span>
          <span className={filterCountClass(filter === 'all')}>{allCount}</span>
        </Link>
        <Link href={buildFilterHref('drafts')} className={filterChipClass(filter === 'drafts')}>
          <span>{t('list.filter.drafts')}</span>
          <span className={filterCountClass(filter === 'drafts')}>{draftCount}</span>
        </Link>
        <Link
          href={buildFilterHref('published')}
          className={filterChipClass(filter === 'published')}
        >
          <span>{t('list.filter.published')}</span>
          <span className={filterCountClass(filter === 'published')}>{publishedCount}</span>
        </Link>
      </nav>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {filter === 'drafts' ? t('list.emptyDrafts') : t('list.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ chunk, profile }) => {
            const isDraft = chunk.status === 'draft';
            const topics = isDraft ? (feedbackTopicsByChunk.get(chunk.id) ?? []) : [];
            return (
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
                  isDraft ? (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        {t('statusDraft')}
                      </span>
                      {topics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                        >
                          {t(`list.feedbackChip.${topic}` as 'list.feedbackChip.title')}
                        </span>
                      ))}
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('filter', filter);
            params.set('page', String(p));
            return `/${locale}/chunks?${params.toString()}`;
          }}
        />
      )}

      {user && (
        <div className="py-4" data-tour-id="chunks-list-create">
          <Link href="/chunks/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('list.newCta')}
            </Button>
          </Link>
        </div>
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}

/**
 * Mirrors `ChunksListContent` (PageTitle → listSubtitle SectionTitle →
 * TopicTabs → filter chips → CatalogListCard list) to minimise CLS.
 */
async function ChunksListSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'chunks' });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        <PageTitle>{t('listTitle')}</PageTitle>
        {/* HelpTourButton placeholder — the real page always renders it here */}
        <div className="h-5 w-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      </div>

      <PagePanel>
        <SectionTitle>{t('listSubtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        {/* Filter chips (all / drafts / published) */}
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-muted" />
          ))}
        </div>

        <TopicCardSkeleton />
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file here
 * would wrap this whole subtree (including `/chunks/[slug]`) in a
 * `<Suspense>` boundary, so navigating straight into a specific chunk (e.g.
 * via `RelatedTags` on the position-memory/puzzle pages, or `ChunkRefLink`
 * on a shared game review) would flash this catalog-list skeleton before
 * the detail page's own skeleton mounted. Scoping the boundary inside this
 * page's own JSX means it only exists in the render tree when this exact
 * route is the matched leaf.
 */
export default function ChunksListPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ChunksListSkeleton />}>
      <ChunksListContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
