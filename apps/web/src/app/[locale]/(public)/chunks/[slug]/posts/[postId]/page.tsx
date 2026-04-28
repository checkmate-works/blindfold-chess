import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { AttachedEmbedCard } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import { AttachedGameCard } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { getPostByIdAndTopicKey } from '@/app/[locale]/(public)/topics/_lib/queries';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReply } from './_actions/createReply';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; slug: string; postId: string }>;
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

export default async function ChunkPostDetailPage({ params }: Props) {
  const { locale, slug, postId } = await params;

  const chunk = await getChunkBySlug(slug);
  if (!chunk) {
    notFound();
  }

  const post = await getPostByIdAndTopicKey(postId, 'chunk', slug);
  if (!post) {
    notFound();
  }

  const { user, replies, likeMeta, isAuthor, canReply } = await fetchPostDetailData(postId, post);

  const attachments = await getAttachmentsForPosts([postId]);
  const attachment = attachments.get(postId) ?? null;

  const ct = await getTranslations({ locale, namespace: 'topics.chunks' });

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
      backLink={{
        href: `/chunks/${slug}`,
        label: ct('postDetail.backToChunk', { name: chunk.title }),
      }}
      post={post}
      user={user}
      topicKey={slug}
      likeMeta={likeMeta}
      replies={replies}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      createReplyAction={createReply}
      redirectPath={`/${locale}/chunks/${slug}`}
      i18n={{
        likeNamespace: 'topics.chunks',
        deleteNamespace: 'topics.chunks.deletePost',
        replyNamespace: 'topics.chunks.replies',
        repliesTitle: ct('replies.title'),
        repliesCount: ct('replies.count', { count: replies.length }),
        noReplies: ct('replies.noReplies'),
        loginToReply: ct('replies.loginToReply'),
      }}
      breadcrumbItems={[
        { label: 'Chunks', href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: ct('readMore') },
      ]}
      extraContent={
        attachment ? (
          attachment.kind === 'pgn' ? (
            <AttachedGameCard attachment={attachment.data} />
          ) : (
            <AttachedEmbedCard attachment={attachment.data} />
          )
        ) : undefined
      }
    />
  );
}
