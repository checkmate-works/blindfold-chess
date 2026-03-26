import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { PostDetailContent } from '@/app/[locale]/(public)/topics/_components/PostDetailContent';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
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

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/squares/${square}/posts/${postId}`,
    }),
    title: t('title', { square }),
    description: t('description', { square }),
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

  const { user, replies, likeMeta, isAuthor, canReply } = await fetchPostDetailData(postId, post);

  const t = await getTranslations({ locale, namespace: 'topics' });

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? t('squares.replies.followRequired')
      : null;

  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          {t('squares.postDetail.authorView', { author: displayName, square })}
        </SectionTitle>

        <SquareHighlightBoard square={square} locale={locale} />

        <div>
          <Link
            href={`/topics/squares/${square}`}
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {t('squares.postDetail.backToSquare', { square })}
          </Link>
        </div>

        <PostDetailContent
          post={post}
          user={user}
          locale={locale}
          topicKey={square}
          likeMeta={likeMeta}
          replies={replies}
          canReply={canReply}
          replyRestrictionMessage={replyRestrictionMessage}
          toggleLikeAction={toggleLike}
          deletePostAction={deletePost}
          createReplyAction={createReply}
          redirectPath={`/${locale}/topics/squares/${square}`}
          likeI18nNamespace="topics.squares"
          deleteI18nNamespace="topics.squares.deletePost"
          replyI18nNamespace="topics.squares.replies"
          repliesTitle={t('squares.replies.title')}
          repliesCount={t('squares.replies.count', { count: replies.length })}
          noReplies={t('squares.replies.noReplies')}
          loginToReply={t('squares.replies.loginToReply')}
        />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('squares.title'), href: '/topics/squares' },
            { label: square, href: `/topics/squares/${square}` },
            { label: t('squares.readMore') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
