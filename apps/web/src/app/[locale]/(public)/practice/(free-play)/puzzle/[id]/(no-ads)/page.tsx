/**
 * This page relies on its sibling `(no-ads)/layout.tsx` to suppress ads:
 * the layout calls `markNoAdsScope()`, which causes `resolveAdGuard()` to
 * short-circuit to `'hidden'` for every AdSense slot rendered here.
 *
 * Moving this page out of the `(no-ads)/` route group will re-enable ads.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlay, FaPlusCircle } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import {
  getPostCountByTopicKey,
  getPostsWithReplyMetaPaginatedByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { RelatedChunks } from '@/app/[locale]/_components/RelatedChunks';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzlePiecesInfo } from '../../_components/PuzzlePiecesInfo';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';
import { NewPostForm } from './_components/NewPostForm';
import { PostCard } from './_components/PostCard';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

const COMMENT_PAGE_SIZE = 20;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

  const row = await loadPuzzleWithSolutions(id);

  if (!row) {
    return { title: t('detail.title') };
  }

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}`,
      title: row.position.title,
      description: t('description'),
    }),
    title: resolveTitle(row.position.title, locale),
  };
}

export default async function PuzzleDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tComments = await getTranslations({ locale, namespace: 'topics.positionPuzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  const row = await loadPuzzleWithSolutions(id);

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveDisplayName(profile);

  const currentUser = await getOptionalUser();
  const [likeMeta, relatedChunks, commentCount] = await Promise.all([
    getPositionLikeMeta(position.id, currentUser?.id),
    getLinkedChunksForPosition(position.id),
    getPostCountByTopicKey('position_puzzle', position.id),
  ]);

  const comments = await getPostsWithReplyMetaPaginatedByTopicKey(
    'position_puzzle',
    position.id,
    COMMENT_PAGE_SIZE,
    0,
    currentUser?.id,
    'new'
  );

  const authorBadge = (
    <>
      {profile?.avatarUrl ? (
        <Image
          src={profile.avatarUrl}
          alt={displayName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className={`font-medium text-foreground${profile?.username ? ' hover:underline' : ''}`}>
        {displayName}
      </span>
    </>
  );

  return (
    <div className="space-y-8">
      <PageTitle>{position.title}</PageTitle>

      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

          {position.description && (
            <p className="text-foreground whitespace-pre-wrap">{position.description}</p>
          )}

          <PuzzlePiecesInfo fen={position.fen} locale={locale} />

          <div className="flex justify-center">
            <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
              <Button asChild variant="secondary" icon={<FaPlusCircle className="w-3 h-3" />}>
                {tPlay('newGameFromHere')}
              </Button>
            </Link>
          </div>

          <RelatedChunks chunks={relatedChunks} locale={locale} />

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>{t('detail.createdBy')}</span>
            {profile?.username ? (
              <Link
                href={`/u/${profile.username}`}
                locale={locale}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {authorBadge}
              </Link>
            ) : (
              authorBadge
            )}
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <LikeButton
              postId={position.id}
              locale={locale}
              topicKey=""
              initialLikeCount={likeMeta.likeCount}
              initialLikedByMe={likeMeta.likedByMe}
              toggleLikeAction={toggleLike}
              i18nNamespace="practice.puzzle.detail"
            />
            <time dateTime={position.createdAt.toISOString()}>
              {position.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          <div className="pt-2">
            <Link href={`/practice/puzzle/${position.id}/session`}>
              <Button asChild variant="primary" size="lg" icon={<FaPlay />} fullWidth>
                {t('detail.startSolving')}
              </Button>
            </Link>
          </div>

          <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

          <p className="text-sm text-muted-foreground">
            {tComments('postCount', { count: commentCount })}
          </p>

          <p className="text-sm text-muted-foreground">{tComments('commentGuidelineSpoiler')}</p>

          {currentUser ? (
            <NewPostForm locale={locale} positionId={position.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href={`/${locale}/sign-in`} className="text-link-primary hover:underline">
                {tComments('signInToComment')}
              </Link>
            </p>
          )}

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((post) => (
                <div key={post.id} id={`post-${post.id}`}>
                  <PostCard post={post} locale={locale} positionId={position.id} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{tComments('noPosts')}</p>
          )}
        </div>

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/puzzle' },
            { label: position.title },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
