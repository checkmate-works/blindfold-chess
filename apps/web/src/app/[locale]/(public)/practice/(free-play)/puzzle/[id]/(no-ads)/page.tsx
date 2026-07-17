/**
 * This page relies on its sibling `(no-ads)/layout.tsx` to suppress ads:
 * the layout calls `markNoAdsScope()`, and every `<AdSlot>` rendered here
 * checks `isNoAdsScope()` first and renders nothing.
 *
 * Moving this page out of the `(no-ads)/` route group will re-enable ads.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaBrain, FaPlay, FaPlusCircle } from 'react-icons/fa';
import { FiEdit2, FiGitBranch } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { resolveAuthorName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { encodeFenToBase64Url } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_lib/share-url';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { CommentTreeLoadMore } from '@/app/[locale]/(public)/topics/_components/CommentTreeLoadMore';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, SectionTitle } from '@/app/[locale]/_components';
import { RelatedTags } from '@/app/[locale]/_components/RelatedTags';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ForkProvenanceNote } from '../../../_components/ForkProvenanceNote';
import { PositionAuthorAttribution } from '../../../_components/PositionAuthorAttribution';
import { PositionDetailLayout } from '../../../_components/PositionDetailLayout';
import { PositionPeekBoard } from '../../../_components/PositionPeekBoard';
import { PositionEditRequestCallout } from '../../../_components/edit-request/PositionEditRequestCallout';
import { loadPositionDetail } from '../../../_lib/load-position-detail';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';
import { loadMorePuzzleComments } from './_actions/loadMorePuzzleComments';
import { NewPostForm } from './_components/NewPostForm';
import { PuzzleCommentTreeBatch } from './_components/PuzzleCommentTreeBatch';

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
  const tTags = await getTranslations({ locale, namespace: 'practice.tags' });
  const tComments = await getTranslations({ locale, namespace: 'topics.positionPuzzle' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const tPractice = await getTranslations({ locale, namespace: 'practice' });

  const row = await loadPuzzleWithSolutions(id);

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  const displayName = resolveAuthorName(profile, { fallback: tCommon('deletedUser') });

  const currentUser = await getOptionalUser();
  const {
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
  } = await loadPositionDetail({
    position,
    kind: 'puzzle',
    currentUserId: currentUser?.id,
    locale,
    sortBy,
  });

  const forkedFromNote = (
    <ForkProvenanceNote
      positionId={position.id}
      forkedFromId={position.forkedFromId}
      forkParent={forkParent}
      forkCount={forkCount}
      pathPrefix="practice/puzzle"
      labels={{
        forkedFrom: t('detail.forkedFrom'),
        forkedFromDeleted: t('detail.forkedFromDeleted'),
        forksSection: (count) => t('detail.forksSection', { count }),
      }}
    />
  );

  return (
    <PositionDetailLayout
      title={position.title}
      locale={locale}
      headerNote={forkedFromNote}
      breadcrumbItems={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/puzzle' },
        { label: position.title },
      ]}
    >
      <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

      {position.description && (
        <p className="text-foreground whitespace-pre-wrap">{position.description}</p>
      )}

      <PiecesInfo fen={position.fen} />

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
      />

      <div className="pt-2">
        {/* Puzzle-solving is the primary action, so it leads and sits high
            enough to land in the first view. The "or" divider then frames the
            two alternative ways to reuse this position — the same primary /
            "or" / alternatives shape the challenge modules use for
            challenge-vs-training (see PracticeSetupActions). */}
        <Link href={`/practice/puzzle/${position.id}/session`}>
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} fullWidth>
            {t('detail.startSolving')}
          </Button>
        </Link>

        <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
          <Divider className="flex-1" />
          <span className="text-sm text-muted-foreground">{tPractice('orDivider')}</span>
          <Divider className="flex-1" />
        </div>

        <div className="flex flex-col gap-3">
          <Link href={`/practice/position-memory/custom/${encodeFenToBase64Url(position.fen)}`}>
            <Button asChild variant="secondary" size="lg" icon={<FaBrain />} fullWidth>
              {t('detail.memorizeOnly')}
            </Button>
          </Link>
          <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
            <Button asChild variant="secondary" size="lg" icon={<FaPlusCircle />} fullWidth>
              {tPlay('newGameFromHere')}
            </Button>
          </Link>
        </div>
      </div>

      <PositionEditRequestCallout
        positionId={position.id}
        positionType="puzzle"
        viewerId={currentUser?.id ?? null}
        ownerId={position.userId}
        locale={locale}
      />

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
        <div className="flex items-center gap-4">
          {currentUser?.id === position.userId && (
            <Link
              href={`/practice/puzzle/${position.id}/edit`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
            >
              <FiEdit2 className="h-3 w-3" aria-hidden />
              {t('detail.editAction')}
            </Link>
          )}
          {canFork && (
            <Link
              href={`/practice/puzzle/new?from=${position.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
            >
              <FiGitBranch className="h-3 w-3" aria-hidden />
              {t('detail.forkAction')}
            </Link>
          )}
          <time dateTime={position.createdAt.toISOString()}>
            {position.createdAt.toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {position.updatedAt.getTime() - position.createdAt.getTime() > 1000 && (
            <span className="text-muted-foreground">{t('detail.edited')}</span>
          )}
        </div>
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
            basePath={`/practice/puzzle/${position.id}`}
            translationKey="topics.positionPuzzle.sort"
            currentSort={sortBy}
          />
          <CommentTreeLoadMore
            resetKey={sortBy}
            initialHasMore={hasMoreComments}
            initialOffset={COMMENT_TREE_PAGE_SIZE}
            loadMoreAction={loadMorePuzzleComments.bind(null, position.id, locale, sortBy)}
            labels={{
              showMore: tTopics('loadMoreComments.showMore'),
              loading: tTopics('loadMoreComments.loading'),
              retry: tTopics('loadMoreComments.retry'),
              error: tTopics('loadMoreComments.error'),
            }}
          >
            <PuzzleCommentTreeBatch
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
    </PositionDetailLayout>
  );
}
