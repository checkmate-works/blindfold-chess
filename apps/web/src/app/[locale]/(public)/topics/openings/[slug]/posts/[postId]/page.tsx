import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../../../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../../../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostById } from '../../../_lib/queries';
import { RatingDisplay } from '../../_components';
import { createReply } from './_actions/createReply';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; slug: string; postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, postId } = await params;

  const opening = await getOpeningBySlug(slug);
  if (!opening) {
    return {};
  }

  const post = await getOpeningPostById(postId, slug);
  if (!post) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningPost' });

  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  const title = t('title', { name: displayName });
  const description = t('description', { name: displayName });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/openings/${slug}/posts/${postId}`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function OpeningPostDetailPage({ params, searchParams }: Props) {
  const { locale, slug, postId } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');

  const opening = await getOpeningBySlug(slug);
  if (!opening) {
    notFound();
  }

  const post = await getOpeningPostById(postId, slug);
  if (!post) {
    notFound();
  }

  const { user, rootWithMeta, replies, isAuthor, canReply } = await fetchPostDetailData(
    postId,
    post
  );

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? dt('replies.followRequired')
      : null;

  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <TopicPostDetailLayout
      locale={locale}
      pageTitle={dt('detail.pageTitle')}
      sectionTitle={dt('postDetail.authorView', { author: authorName, name: displayName })}
      topicVisual={<OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />}
      opMeta={
        post.rating ? (
          <RatingDisplay
            preferenceRating={post.rating.preferenceRating}
            proficiencyRating={post.rating.proficiencyRating}
          />
        ) : undefined
      }
      rootWithMeta={rootWithMeta}
      replies={replies}
      user={user}
      topicKey={slug}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      createReplyAction={createReply}
      redirectPath={`/${locale}/topics/openings/${slug}`}
      i18n={{
        likeNamespace: 'topics.openings.postDetail',
        deleteNamespace: 'topics.openings.deletePost',
        replyNamespace: 'topics.openings.replies',
      }}
      comments={{
        sectionTitle: dt('replies.title'),
        countText: dt('replies.count', { count: replies.length }),
        sortBy,
        sortBasePath: `/topics/openings/${slug}/posts/${postId}`,
        sortTranslationKey: 'topics.openings.sort',
      }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('openings.title'), href: '/topics/openings' },
        { label: displayName, href: `/topics/openings/${slug}` },
        { label: t('openings.readMore') },
      ]}
    />
  );
}
