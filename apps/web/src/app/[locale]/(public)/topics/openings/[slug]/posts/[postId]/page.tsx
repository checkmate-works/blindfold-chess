import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
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
  // The OP's attachment renders inside the OP card's `opAttachment`
  // slot (rendered after the body — matching CommentNode's
  // attachment position so the OP and replies stay layout-aligned).
  // The opening's rating display stays in the `opMeta` slot ABOVE
  // the body because it reads as metadata about the post (a rating
  // annotation), not as inline content. Each reply's attachment
  // flows into `extraContentByPostId` for the same after-body
  // placement under each CommentNode.
  const replyIds = replies.map((r) => r.id);
  const allPostIds = [postId, ...replyIds];
  const attachments = await getAttachmentsForPosts(allPostIds);
  const opAttachmentRow = attachments.get(postId) ?? null;

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');
  const opAttachment = opAttachmentRow
    ? renderAttachment(opAttachmentRow, fallbackVideoTitle)
    : undefined;
  const replyExtraContentByPostId = buildAttachmentNodeMap(
    replyIds,
    attachments,
    fallbackVideoTitle
  );

  const opMeta = post.rating ? (
    <RatingDisplay
      preferenceRating={post.rating.preferenceRating}
      proficiencyRating={post.rating.proficiencyRating}
    />
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
      opAttachment={opAttachment}
      rootWithMeta={rootWithMeta}
      replies={replies}
      user={user}
      topicKey={slug}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      editPostAction={editPost}
      removeAttachmentAction={removePostAttachment}
      attachPgnAction={attachPostPgn}
      attachFenAction={attachPostFenFromForm}
      attachmentsByPostId={attachments}
      attachmentFallbackVideoTitle={fallbackVideoTitle}
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
