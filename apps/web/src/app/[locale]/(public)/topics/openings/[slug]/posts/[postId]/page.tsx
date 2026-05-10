import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import {
  buildAttachmentNodeMap,
  renderAttachment,
} from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../../../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../../../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostById } from '../../../_lib/queries';
import { RatingDisplay } from '../../_components';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
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

  // Fetch attachments for the OP AND every reply in one round-trip.
  // The OP's attachment renders inside the OP card's `opMeta` slot,
  // composed with the optional rating display so both can coexist.
  // Each reply's attachment flows into `extraContentByPostId` and is
  // rendered under the matching CommentNode in the tree.
  const replyIds = replies.map((r) => r.id);
  const allPostIds = [postId, ...replyIds];
  const attachments = await getAttachmentsForPosts(allPostIds);
  const opAttachment = attachments.get(postId) ?? null;

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');
  const replyExtraContentByPostId = buildAttachmentNodeMap(
    replyIds,
    attachments,
    fallbackVideoTitle
  );

  // Compose the OP card meta. Rating + attachment can both be present
  // (a rating-bearing post can also carry an attached game/FEN), so
  // render them in order so the rating stays anchored at the top.
  const ratingNode = post.rating ? (
    <RatingDisplay
      preferenceRating={post.rating.preferenceRating}
      proficiencyRating={post.rating.proficiencyRating}
    />
  ) : null;
  const attachmentNode = opAttachment ? renderAttachment(opAttachment, fallbackVideoTitle) : null;
  const opMeta =
    ratingNode || attachmentNode ? (
      <>
        {ratingNode}
        {attachmentNode}
      </>
    ) : undefined;

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
      opMeta={opMeta}
      rootWithMeta={rootWithMeta}
      replies={replies}
      user={user}
      topicKey={slug}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      replyAttachmentActions={{
        pgn: createReplyWithAttachment,
        fen: createReplyWithFenAttachment,
      }}
      extraContentByPostId={replyExtraContentByPostId}
      redirectPath={`/${locale}/topics/openings/${slug}`}
      i18n={{
        likeNamespace: 'topics.openings.postDetail',
        deleteNamespace: 'topics.openings.deletePost',
        replyNamespace: 'topics.openings.replies',
      }}
      comments={{
        sectionTitle: dt('replies.title'),
        count: replies.length,
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
