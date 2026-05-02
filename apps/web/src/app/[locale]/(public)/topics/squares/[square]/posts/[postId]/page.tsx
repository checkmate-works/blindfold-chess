import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPostById } from '../../../_lib/queries';
import { isValidSquare } from '../../../_lib/squares';
import { SquareHighlightBoard } from '../../_components';
import { createReply } from './_actions/createReply';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; square: string; postId: string }>;
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

export default async function PostDetailPage({ params }: Props) {
  const { locale, square, postId } = await params;

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

  const t = await getTranslations({ locale, namespace: 'topics' });

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? t('squares.replies.followRequired')
      : null;

  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <TopicPostDetailLayout
      locale={locale}
      pageTitle={t('squares.pageTitle')}
      sectionTitle={t('squares.postDetail.authorView', { author: displayName, square })}
      topicVisual={<SquareHighlightBoard square={square} locale={locale} />}
      backLink={{
        href: `/topics/squares/${square}`,
        label: t('squares.postDetail.backToSquare', { square }),
      }}
      rootWithMeta={rootWithMeta}
      replies={replies}
      user={user}
      topicKey={square}
      canReply={canReply}
      replyRestrictionMessage={replyRestrictionMessage}
      toggleLikeAction={toggleLike}
      deletePostAction={deletePost}
      createReplyAction={createReply}
      redirectPath={`/${locale}/topics/squares/${square}`}
      i18n={{
        likeNamespace: 'topics.squares',
        deleteNamespace: 'topics.squares.deletePost',
        replyNamespace: 'topics.squares.replies',
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
