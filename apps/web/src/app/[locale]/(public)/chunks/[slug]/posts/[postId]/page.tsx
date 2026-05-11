import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import {
  buildAttachmentNodeMap,
  renderAttachment,
} from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { getPostByIdAndTopicKey } from '@/app/[locale]/(public)/topics/_lib/queries';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; slug: string; postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, postId } = await params;

  const chunk = await getChunkBySlug(slug);
  if (!chunk) {
    return {};
  }

  const post = await getPostByIdAndTopicKey(postId, 'chunk', slug);
  if (!post) {
    return {};
  }

  const title = chunk.title;
  const description = chunk.description ?? undefined;

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `chunks/${slug}/posts/${postId}`,
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    ...(description && { description }),
  };
}

export default async function ChunkPostDetailPage({ params, searchParams }: Props) {
  const { locale, slug, postId } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');

  const chunk = await getChunkBySlug(slug);
  if (!chunk) {
    notFound();
  }

  const post = await getPostByIdAndTopicKey(postId, 'chunk', slug);
  if (!post) {
    notFound();
  }

  const { user, rootWithMeta, replies, isAuthor, canReply } = await fetchPostDetailData(
    postId,
    post
  );

  // Fetch in one round-trip the OP's attachment AND every reply's
  // attachment. The OP's render flows into the OP card via the
  // `opAttachment` slot (rendered after the body, matching how
  // CommentNode positions its own attachment relative to the comment
  // body); each reply's flows into `extraContentByPostId` so
  // CommentTree surfaces the same Attached* card under the matching
  // reply.
  const replyIds = replies.map((r) => r.id);
  const allPostIds = [postId, ...replyIds];
  const attachments = await getAttachmentsForPosts(allPostIds);
  const opAttachmentRow = attachments.get(postId) ?? null;

  const ct = await getTranslations({ locale, namespace: 'topics.chunks' });
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

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? ct('replies.followRequired')
      : null;

  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <TopicPostDetailLayout
      locale={locale}
      pageTitle={ct('detail.pageTitle')}
      sectionTitle={ct('postDetail.authorView', { author: authorName, name: chunk.title })}
      topicVisual={
        <div className="max-w-xs mx-auto">
          <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-full" />
        </div>
      }
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
      replyAttachmentActions={{
        pgn: createReplyWithAttachment,
        fen: createReplyWithFenAttachment,
      }}
      extraContentByPostId={replyExtraContentByPostId}
      redirectPath={`/${locale}/chunks/${slug}`}
      i18n={{
        likeNamespace: 'topics.chunks',
        deleteNamespace: 'topics.chunks.deletePost',
        replyNamespace: 'topics.chunks.replies',
      }}
      comments={{
        sectionTitle: ct('replies.title'),
        count: replies.length,
        sortBy,
        sortBasePath: `/chunks/${slug}/posts/${postId}`,
        sortTranslationKey: 'topics.chunks.sort',
      }}
      breadcrumbItems={[
        { label: 'Chunks', href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: ct('readMore') },
      ]}
    />
  );
}
