/**
 * This page relies on its sibling `(no-ads)/layout.tsx` to suppress ads:
 * the layout calls `markNoAdsScope()`, which causes `resolveAdGuard()` to
 * short-circuit to `'hidden'` for every AdSense slot rendered here.
 *
 * Moving this page out of the `(no-ads)/` route group will re-enable ads.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlay, FaPlusCircle } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { RelatedChunks } from '@/app/[locale]/_components/RelatedChunks';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionAuthorAttribution } from '../../../_components/PositionAuthorAttribution';
import { PositionDetailLayout } from '../../../_components/PositionDetailLayout';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';
import { createReply } from './_actions/createReply';
import { togglePositionPuzzlePostLike } from './_actions/togglePositionPuzzlePostLike';
import { NewPostForm } from './_components/NewPostForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function PuzzleDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tComments = await getTranslations({ locale, namespace: 'topics.positionPuzzle' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  const row = await loadPuzzleWithSolutions(id);

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveDisplayName(profile);

  const currentUser = await getOptionalUser();
  const [likeMeta, relatedChunks, commentCount, allComments] = await Promise.all([
    getPositionLikeMeta(position.id, currentUser?.id),
    getLinkedChunksForPosition(position.id),
    getPostCountByTopicKey('position_puzzle', position.id),
    getCommentTreeForTopic('position_puzzle', position.id, currentUser?.id),
  ]);

  const commentTree = buildCommentTree(allComments, sortBy);

  return (
    <PositionDetailLayout
      title={position.title}
      breadcrumb={
        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/puzzle' },
            { label: position.title },
          ]}
          locale={locale}
        />
      }
    >
      <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

      {position.description && (
        <p className="text-foreground whitespace-pre-wrap">{position.description}</p>
      )}

      <PiecesInfo fen={position.fen} />

      <div className="flex justify-center">
        <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
          <Button asChild variant="secondary" icon={<FaPlusCircle className="w-3 h-3" />}>
            {tPlay('newGameFromHere')}
          </Button>
        </Link>
      </div>

      <RelatedChunks chunks={relatedChunks} locale={locale} />

      <PositionAuthorAttribution
        profile={profile}
        displayName={displayName}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
      />

      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <LikeButton
          postId={position.id}
          locale={locale}
          topicKey=""
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="practice.puzzle"
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

      {currentUser ? (
        <JoinConversationToggle
          countText={tComments('postCount', { count: commentCount })}
          joinLabel={tTopics('joinConversation')}
        >
          <NewPostForm locale={locale} positionId={position.id} />
        </JoinConversationToggle>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={`/${locale}/sign-in`} className="text-link-primary hover:underline">
            {tComments('signInToComment')}
          </Link>
        </p>
      )}

      {commentTree.length > 0 ? (
        <>
          <SortSelect
            basePath={`/practice/puzzle/${position.id}`}
            translationKey="topics.positionPuzzle.sort"
            currentSort={sortBy}
          />
          <CommentTree
            comments={commentTree}
            locale={locale}
            topicKey={position.id}
            currentUserId={currentUser?.id}
            enableSpoiler
            redirectPath={`/${locale}/practice/puzzle/${position.id}`}
            toggleLikeAction={togglePositionPuzzlePostLike}
            createReplyAction={createReply}
            deletePostAction={deletePost}
            i18n={{
              likeNamespace: 'topics.positionPuzzle',
              replyNamespace: 'topics.positionPuzzle.replies',
              deleteNamespace: 'topics.positionPuzzle.deletePost',
            }}
          />
        </>
      ) : (
        <p className="text-muted-foreground text-center py-8">{tComments('noPosts')}</p>
      )}
    </PositionDetailLayout>
  );
}
