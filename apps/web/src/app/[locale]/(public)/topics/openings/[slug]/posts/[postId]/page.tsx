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

import { OpeningBoardWithMoves } from '../../../_components/OpeningBoardWithMoves';
import { getOpeningBySlug, getOpeningPostById } from '../../../_lib/queries';
import { RatingDisplay } from '../../_components';
import { createReply } from './_actions/createReply';
import { toggleLike } from './_actions/toggleLike';

type Props = {
  params: Promise<{ locale: Locale; slug: string; postId: string }>;
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
  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/openings/${slug}/posts/${postId}`,
    }),
    title: t('title', { name: displayName }),
    description: t('description', { name: displayName }),
  };
}

export default async function OpeningPostDetailPage({ params }: Props) {
  const { locale, slug, postId } = await params;

  const opening = await getOpeningBySlug(slug);
  if (!opening) {
    notFound();
  }

  const post = await getOpeningPostById(postId, slug);
  if (!post) {
    notFound();
  }

  const { user, replies, likeMeta, isAuthor, canReply } = await fetchPostDetailData(postId, post);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const replyRestrictionMessage =
    !isAuthor && post.replyPermission === 'followers' && !canReply
      ? dt('replies.followRequired')
      : null;

  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';

  return (
    <div className="space-y-8">
      <PageTitle>{dt('detail.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          {dt('postDetail.authorView', { author: authorName, name: displayName })}
        </SectionTitle>

        <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />

        <div>
          <Link
            href={`/topics/openings/${slug}`}
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {dt('postDetail.backToOpening', { name: displayName })}
          </Link>
        </div>

        <PostDetailContent
          post={post}
          user={user}
          locale={locale}
          topicKey={slug}
          likeMeta={likeMeta}
          replies={replies}
          canReply={canReply}
          replyRestrictionMessage={replyRestrictionMessage}
          toggleLikeAction={toggleLike}
          deletePostAction={deletePost}
          createReplyAction={createReply}
          redirectPath={`/${locale}/topics/openings/${slug}`}
          likeI18nNamespace="topics.openings.postDetail"
          deleteI18nNamespace="topics.openings.deletePost"
          replyI18nNamespace="topics.openings.replies"
          repliesTitle={dt('replies.title')}
          repliesCount={dt('replies.count', { count: replies.length })}
          noReplies={dt('replies.noReplies')}
          loginToReply={dt('replies.loginToReply')}
          extraContent={
            post.rating ? (
              <RatingDisplay
                preferenceRating={post.rating.preferenceRating}
                proficiencyRating={post.rating.proficiencyRating}
              />
            ) : undefined
          }
        />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('openings.title'), href: '/topics/openings' },
            { label: displayName, href: `/topics/openings/${slug}` },
            { label: t('openings.readMore') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
