import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { paginateItems } from '@/lib/pagination';
import { createOpeningPostRateLimit, isRateLimited } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { TopicListPageLayout } from '@/app/[locale]/(public)/topics/_components/TopicListPageLayout';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostsWithReplyMeta } from '../_lib/queries';
import { OpeningPostCard } from './_components';
import { NewOpeningPostForm } from './new/_components';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    return {};
  }

  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningDetail' });

  const title = t('title', { name: displayName });
  const description = t('description', { name: displayName });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/openings/${slug}`, title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function OpeningDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  // Fetch parent opening for breadcrumb if this is a child variation
  const parentOpening = opening.parentSlug ? await getOpeningBySlug(opening.parentSlug) : null;
  const parentDisplayName = parentOpening
    ? getOpeningDisplayName(nameT, parentOpening.slug, parentOpening.name)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allPosts = await getOpeningPostsWithReplyMeta(slug, user?.id, sortBy);
  const {
    totalCount,
    totalPages,
    currentPage,
    paginatedItems: posts,
  } = paginateItems(allPosts, TOPIC_PAGE_SIZE, page);

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/openings/${slug}`, p, sortBy);

  const canPost = !!user && !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  const newPostForm = <NewOpeningPostForm locale={locale} slug={slug} />;

  const communitySection = (
    <>
      <SectionTitle>{t('communityThoughts')}</SectionTitle>

      {user ? (
        canPost ? (
          totalCount === 0 ? (
            newPostForm
          ) : (
            <JoinConversationToggle
              countText={dt('postCount', { count: totalCount })}
              joinLabel={t('joinConversation')}
            >
              {newPostForm}
            </JoinConversationToggle>
          )
        ) : null
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/sign-in" locale={locale} className="text-link-primary hover:underline">
            {t('signInToJoin')}
          </Link>
        </p>
      )}

      {totalCount > 0 && (
        <SortSelect
          basePath={`/topics/openings/${slug}`}
          translationKey="topics.openings.sort"
          currentSort={sortBy}
        />
      )}
    </>
  );

  return (
    <TopicListPageLayout
      locale={locale}
      pageTitle={dt('pageTitle')}
      sectionTitle={displayName}
      adBottom={
        (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )
      }
      topicHeader={
        currentPage === 1 ? (
          <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />
        ) : undefined
      }
      communitySection={communitySection}
      hasPosts={posts.length > 0}
      postCards={posts.map((post) => (
        <OpeningPostCard key={post.id} post={post} locale={locale} slug={slug} />
      ))}
      pagination={{ currentPage, totalPages, buildHref }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('openings.title'), href: '/topics/openings' },
        ...(parentOpening && parentDisplayName
          ? [
              {
                label: parentDisplayName,
                href: `/topics/openings/${parentOpening.slug}`,
              },
            ]
          : []),
        { label: displayName },
      ]}
    />
  );
}
