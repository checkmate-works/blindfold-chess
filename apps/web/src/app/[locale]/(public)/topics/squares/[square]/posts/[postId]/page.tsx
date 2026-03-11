import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { Breadcrumb, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LikeButton, UserAvatar } from '../../../_components';
import { getLikeMetaForPost, getPostById, getRepliesByPostId } from '../../../_lib/queries';
import { isValidSquare } from '../../../_lib/squares';
import { SquareHighlightBoard } from '../../_components';
import { DeletePostButton, ReplyForm, ReplyList } from './_components';

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [replies, likeMeta] = await Promise.all([
    getRepliesByPostId(postId, user?.id),
    getLikeMetaForPost(postId, user?.id),
  ]);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;

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

        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={post.author?.avatarUrl}
            displayName={displayName}
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

          <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </div>

          <div className="flex items-center gap-4">
            <LikeButton
              postId={post.id}
              locale={locale}
              square={square}
              initialLikeCount={likeMeta.likeCount}
              initialLikedByMe={likeMeta.likedByMe}
            />
            {user && user.id === post.userId && (
              <DeletePostButton postId={post.id} locale={locale} square={square} />
            )}
          </div>
        </div>

        <SectionTitle>
          {t('squares.replies.title')} ({t('squares.replies.count', { count: replies.length })})
        </SectionTitle>

        {replies.length > 0 ? (
          <ReplyList replies={replies} locale={locale} square={square} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('squares.replies.noReplies')}</p>
        )}

        {user ? (
          <ReplyForm locale={locale} square={square} postId={postId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link
              href="/sign-in"
              locale={locale}
              className="text-foreground underline hover:text-muted-foreground transition-colors"
            >
              {t('squares.replies.loginToReply')}
            </Link>
          </p>
        )}

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
