import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlusCircle, FaPuzzlePiece } from 'react-icons/fa';
import { FiEdit2, FiGitBranch } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { countContentRevisionsForPosition } from '@/lib/positions/content-revision-queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { RankAchievementModal } from '@/app/[locale]/(public)/practice/_components/RankAchievementModal';
import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, SectionTitle } from '@/app/[locale]/_components';
import type { ActionsMenuItem } from '@/app/[locale]/_components/ActionsMenu';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { RelatedTags } from '@/app/[locale]/_components/RelatedTags';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../../_actions/toggleLike';
import { ForkProvenanceNote } from '../../_components/ForkProvenanceNote';
import { PositionAuthorHeader } from '../../_components/PositionAuthorHeader';
import { PositionDetailLayout } from '../../_components/PositionDetailLayout';
import { PositionPeekBoard } from '../../_components/PositionPeekBoard';
import {
  PositionEditRequestSuggestLink,
  PositionEditRequestSummaryLink,
} from '../../_components/edit-request/PositionEditRequestLinks';
import { loadPositionDetail } from '../../_lib/load-position-detail';
import { PositionStartForm } from '../_components/single-position/PositionStartForm';
import { loadMorePositionMemoryComments } from './_actions/loadMorePositionMemoryComments';
import { NewPostForm } from './_components/NewPostForm';
import { PositionMemoryCommentTreeBatch } from './_components/PositionMemoryCommentTreeBatch';

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
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    return { title: t('detail.title') };
  }

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/position-memory/${id}`,
      title: row.position.title,
      description: t('description'),
    }),
    title: resolveTitle(row.position.title, locale),
  };
}

export default async function PositionDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tTags = await getTranslations({ locale, namespace: 'practice.tags' });
  const tComments = await getTranslations({ locale, namespace: 'topics.positionMemory' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const tPractice = await getTranslations({ locale, namespace: 'practice' });

  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  const displayName = resolveAuthorName(profile, { fallback: tCommon('deletedUser') });

  const currentUser = await getOptionalUser();
  const [
    {
      likeMeta,
      relatedChunks,
      relatedThemes,
      commentCount,
      comments,
      hasMoreComments,
      forkParent,
      forkCount,
      canFork,
      attachments,
    },
    revisionCount,
  ] = await Promise.all([
    loadPositionDetail({
      position,
      kind: 'memory',
      currentUserId: currentUser?.id,
      locale,
      sortBy,
    }),
    countContentRevisionsForPosition(position.id),
  ]);

  // See the puzzle detail page for why the tracked count takes priority
  // over the timestamp heuristic (only fires on a genuine content change,
  // and is the only signal that can link to `/history`).
  const hasTrackedHistory = revisionCount > 0;
  const editedByLegacyHeuristic =
    position.updatedAt.getTime() - position.createdAt.getTime() > 1000;

  const forkedFromNote = (
    <ForkProvenanceNote
      positionId={position.id}
      forkedFromId={position.forkedFromId}
      forkParent={forkParent}
      forkCount={forkCount}
      pathPrefix="practice/position-memory"
      labels={{
        forkedFrom: t('detail.forkedFrom'),
        forkedFromDeleted: t('detail.forkedFromDeleted'),
        forksSection: (count) => t('detail.forksSection', { count }),
        // Unreachable here: a position-memory entry's forkedFromId can only
        // point at another position-memory row (POSITION_FORK_SOURCE_TYPES
        // is memory-only in @/lib/positions/fork), so forkParent.type never
        // differs from this page's own kind. Required by the shared prop
        // type; reuse the same strings since ForkProvenanceNote never
        // selects them on this page.
        crossTypeFrom: t('detail.forkedFrom'),
        crossTypeFromDeleted: t('detail.forkedFromDeleted'),
      }}
    />
  );

  const menuItems: ActionsMenuItem[] = [
    ...(currentUser?.id === position.userId
      ? [
          {
            key: 'edit',
            label: t('detail.editAction'),
            href: `/${locale}/practice/position-memory/${position.id}/edit`,
            icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
          },
        ]
      : []),
    ...(canFork
      ? [
          {
            key: 'fork',
            label: t('detail.forkAction'),
            href: `/${locale}/practice/position-memory/new?from=${position.id}`,
            icon: <FiGitBranch className="h-4 w-4" aria-hidden />,
          },
          {
            key: 'createPuzzle',
            label: t('detail.createPuzzleFromHere'),
            href: `/${locale}/practice/puzzle/new?from=${position.id}`,
            icon: <FaPuzzlePiece className="h-4 w-4" aria-hidden />,
          },
        ]
      : []),
  ];

  return (
    <PositionDetailLayout
      title={position.title}
      locale={locale}
      headerNote={forkedFromNote}
      bottomAdSense={<AdSlot slot="content-bottom" />}
      breadcrumbItems={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: position.title },
      ]}
    >
      <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

      {position.description && (
        <p className="text-foreground whitespace-pre-wrap">{position.description}</p>
      )}

      <PiecesInfo fen={position.fen} showSideToMove={false} />

      <PositionPeekBoard fen={position.fen} />

      <RelatedTags
        themes={relatedThemes}
        chunks={relatedChunks}
        locale={locale}
        labels={{
          sectionTitle: (count) => t('detail.usefulSection', { count }),
          badgeTheme: tTags('badge.theme'),
          badgeChunk: tTags('badge.chunk'),
        }}
        action={
          <PositionEditRequestSuggestLink
            positionId={position.id}
            positionType="memory"
            viewerId={currentUser?.id ?? null}
            ownerId={position.userId}
            locale={locale}
          />
        }
      />

      {/* Memorizing is the primary action here, so it leads; the "or" divider
          then frames "new game from here" as the alternative way to reuse the
          position — the same primary / "or" / alternatives shape the puzzle
          detail page and the challenge modules use. */}
      <SectionTitle>{t('detail.solveSection')}</SectionTitle>

      <PositionStartForm
        sessionPath={`/practice/position-memory/${position.id}/session`}
        locale={locale}
      />

      <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{tPractice('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <div className="flex flex-col gap-3">
        <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
          <Button asChild variant="secondary" size="lg" icon={<FaPlusCircle />} fullWidth>
            {tPlay('newGameFromHere')}
          </Button>
        </Link>
      </div>

      <PositionAuthorHeader
        profile={profile}
        displayName={displayName}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
        createdAt={position.createdAt}
        edited={hasTrackedHistory || editedByLegacyHeuristic}
        editedLabel={t('detail.edited')}
        editedHref={
          hasTrackedHistory
            ? `/${locale}/practice/position-memory/${position.id}/history`
            : undefined
        }
        menuAriaLabel={t('detail.moreActions')}
        menuItems={menuItems}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <LikeButton
          postId={position.id}
          locale={locale}
          topicKey=""
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="practice.positionMemory"
        />
        <PositionEditRequestSummaryLink
          positionId={position.id}
          positionType="memory"
          locale={locale}
        />
      </div>

      <SectionTitle id="comments">{tComments('commentsTitle')}</SectionTitle>

      {currentUser && commentCount === 0 ? (
        <NewPostForm locale={locale} positionId={position.id} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} positionId={position.id} />
        </JoinConversationToggle>
      )}

      {comments.length > 0 && (
        <>
          <SortSelect
            basePath={`/practice/position-memory/${position.id}`}
            translationKey="topics.positionMemory.sort"
            currentSort={sortBy}
          />
          <CommentTreeLoadMore
            resetKey={sortBy}
            initialHasMore={hasMoreComments}
            initialOffset={COMMENT_TREE_PAGE_SIZE}
            loadMoreAction={loadMorePositionMemoryComments.bind(null, position.id, locale, sortBy)}
            labels={{
              showMore: tTopics('loadMoreComments.showMore'),
              loading: tTopics('loadMoreComments.loading'),
              retry: tTopics('loadMoreComments.retry'),
              error: tTopics('loadMoreComments.error'),
            }}
          >
            <PositionMemoryCommentTreeBatch
              locale={locale}
              positionId={position.id}
              userId={currentUser?.id}
              comments={comments}
              attachments={attachments}
              sortBy={sortBy}
            />
          </CommentTreeLoadMore>
        </>
      )}
      <RankAchievementModal locale={locale} />
    </PositionDetailLayout>
  );
}
