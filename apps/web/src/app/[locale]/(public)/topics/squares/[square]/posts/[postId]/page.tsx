import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPostById } from '../../../_lib/queries';
import { isValidSquare } from '../../../_lib/squares';
import { SquareHighlightBoard } from '../../_components';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; square: string; postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, square, postId } = await params;

  if (!isValidSquare(square)) {
    return {};
  }

  const post = await getPostById(postId, square);
  if (!post) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquarePost' });

  const title = t('title', { square });
  const description = t('description', { square });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/squares/${square}/posts/${postId}`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { locale, square, postId } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');

  if (!isValidSquare(square)) {
    notFound();
  }

  const post = await getPostById(postId, square);
  if (!post) {
    notFound();
  }

  const { user, rootWithMeta, replies, isAuthor, canReply } = await fetchPostDetailData(
    postId,
    post
  );

  // Reply-side attachment payload: fetch attachments for every reply
  // id so a PGN/FEN/embed/image attached to a reply renders inline
  // under that reply via CommentTree. The OP itself doesn't surface
  // an attachment on this page (squares' OP card has no attachment
  // slot), so the OP id is intentionally not in the fetch.
  const replyIds = replies.map((r) => r.id);
  const replyAttachments = replyIds.length > 0 ? await getAttachmentsForPosts(replyIds) : new Map();

  const t = await getTranslations({ locale, namespace: 'topics' });
  const st = await getTranslations({ locale, namespace: 'topics.squares' });
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const replyExtraContentByPostId = buildAttachmentNodeMap(
    replyIds,
    replyAttachments,
    tVideo('fallbackTitle')
  );

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? st('replies.followRequired')
      : null;

  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <TopicPostDetailLayout
      locale={locale}
      pageTitle={t('squares.pageTitle')}
      sectionTitle={t('squares.postDetail.authorView', { author: displayName, square })}
      topicVisual={<SquareHighlightBoard square={square} locale={locale} />}
      rootWithMeta={rootWithMeta}
      replies={replies}
      user={user}
      topicKey={square}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      replyAttachmentActions={{
        pgn: createReplyWithAttachment,
        fen: createReplyWithFenAttachment,
      }}
      extraContentByPostId={replyExtraContentByPostId}
      redirectPath={`/${locale}/topics/squares/${square}`}
      i18n={{
        likeNamespace: 'topics.squares',
        deleteNamespace: 'topics.squares.deletePost',
        replyNamespace: 'topics.squares.replies',
      }}
      comments={{
        sectionTitle: st('replies.title'),
        count: replies.length,
        sortBy,
        sortBasePath: `/topics/squares/${square}/posts/${postId}`,
        sortTranslationKey: 'topics.squares.sort',
      }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('squares.title'), href: '/topics/squares' },
        { label: square, href: `/topics/squares/${square}` },
        { label: t('squares.readMore') },
      ]}
    />
  );
}
