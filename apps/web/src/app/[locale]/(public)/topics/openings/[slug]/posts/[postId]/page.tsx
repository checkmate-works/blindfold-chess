import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { DeletePostButton } from '@/app/[locale]/(public)/topics/_components/DeletePostButton';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { ReplyForm } from '@/app/[locale]/(public)/topics/_components/ReplyForm';
import { ReplyList } from '@/app/[locale]/(public)/topics/_components/ReplyList';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../../../_components/OpeningBoardWithMoves';
import {
  getLikeMetaForPost,
  getOpeningBySlug,
  getOpeningPostById,
  getRepliesByPostId,
} from '../../../_lib/queries';
import { RatingDisplay } from '../../_components';
import { createReply } from './_actions/createReply';
import { deletePost } from './_actions/deletePost';
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [replies, likeMeta] = await Promise.all([
    getRepliesByPostId(postId, user?.id),
    getLikeMetaForPost(postId, user?.id),
  ]);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;

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

        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={post.author?.avatarUrl}
            displayName={authorName}
            locale={locale}
            size="md"
            flair={post.author?.flair}
            country={post.author?.country}
          >
            <div className="text-sm text-muted-foreground">
              <time dateTime={post.createdAt.toISOString()}>
                {post.createdAt.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          </UserAvatar>

          {post.rating && (
            <RatingDisplay
              preferenceRating={post.rating.preferenceRating}
              proficiencyRating={post.rating.proficiencyRating}
            />
          )}

          <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </div>

          <div className="flex items-center gap-4">
            <LikeButton
              postId={post.id}
              locale={locale}
              topicKey={slug}
              initialLikeCount={likeMeta.likeCount}
              initialLikedByMe={likeMeta.likedByMe}
              toggleLikeAction={toggleLike}
              i18nNamespace="topics.openings.postDetail"
            />
            {user && user.id === post.userId && (
              <DeletePostButton
                postId={post.id}
                locale={locale}
                redirectPath={`/${locale}/topics/openings/${slug}`}
                deletePostAction={deletePost}
                i18nNamespace="topics.openings.deletePost"
              />
            )}
          </div>
        </div>

        <SectionTitle>
          {dt('replies.title')} ({dt('replies.count', { count: replies.length })})
        </SectionTitle>

        {replies.length > 0 ? (
          <ReplyList
            replies={replies}
            locale={locale}
            topicKey={slug}
            toggleLikeAction={toggleLike}
            likeI18nNamespace="topics.openings.postDetail"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{dt('replies.noReplies')}</p>
        )}

        {user ? (
          <ReplyForm
            locale={locale}
            topicKey={slug}
            postId={postId}
            createReplyAction={createReply}
            i18nNamespace="topics.openings.replies"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link
              href="/sign-in"
              locale={locale}
              className="text-foreground underline hover:text-muted-foreground transition-colors"
            >
              {dt('replies.loginToReply')}
            </Link>
          </p>
        )}

        <AdBanner slot="topics-openings-detail" locale={locale} />

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
