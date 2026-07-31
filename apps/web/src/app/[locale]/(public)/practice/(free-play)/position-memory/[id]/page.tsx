import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlusCircle, FaPuzzlePiece } from 'react-icons/fa';
import { FiEdit2, FiGitBranch } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionCommentSection } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionCommentSection';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { RankAchievementModal } from '@/app/[locale]/(public)/practice/_components/RankAchievementModal';
import { MoveNotationText } from '@/app/[locale]/(public)/topics/_components/MoveNotationText';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, SectionTitle } from '@/app/[locale]/_components';
import { ActionsMenu, type ActionsMenuItem } from '@/app/[locale]/_components/ActionsMenu';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { RelatedTags } from '@/app/[locale]/_components/RelatedTags';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ForkProvenanceNote } from '../../_components/ForkProvenanceNote';
import { PositionAuthorHeader } from '../../_components/PositionAuthorHeader';
import { PositionDetailLayout } from '../../_components/PositionDetailLayout';
import { PositionEngagementRow } from '../../_components/PositionEngagementRow';
import { PositionPeekBoard } from '../../_components/PositionPeekBoard';
import { PositionEditRequestSuggestLink } from '../../_components/edit-request/PositionEditRequestLinks';
import { loadPositionDetailPage } from '../../_lib/load-position-detail-page';
import { DeletePositionButton } from '../_components/DeletePositionButton';
import { PositionStartForm } from '../_components/single-position/PositionStartForm';
import { loadMorePositionMemoryComments } from './_actions/loadMorePositionMemoryComments';
import { NewPostForm } from './_components/NewPostForm';
import { positionMemoryCommentThread } from './_lib/comment-thread';

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
    hasTrackedHistory,
    edited,
  } = await loadPositionDetailPage({
    position,
    kind: 'memory',
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

  const isOwner = currentUser?.id === position.userId;

  const menuItems: ActionsMenuItem[] = [
    ...(isOwner
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
        <p className="text-foreground whitespace-pre-wrap">
          <MoveNotationText text={position.description} locale={locale} fen={position.fen} />
        </p>
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
        edited={edited}
        editedLabel={t('detail.edited')}
        editedHref={
          hasTrackedHistory
            ? `/${locale}/practice/position-memory/${position.id}/history`
            : undefined
        }
        menu={
          isOwner || menuItems.length > 0 ? (
            <ActionsMenu ariaLabel={t('detail.moreActions')} items={menuItems}>
              {isOwner && <DeletePositionButton positionId={position.id} locale={locale} />}
            </ActionsMenu>
          ) : undefined
        }
      />

      <PositionEngagementRow
        positionId={position.id}
        kind="memory"
        locale={locale}
        likeMeta={likeMeta}
      />

      {/*
       * Mid-page ad above the comment thread. Only when there are comments:
       * with zero comments the page ends just below here, so `content-bottom`
       * is already near the fold and a second ad would only crowd it.
       * `commentCount` is already loaded, so this adds no query.
       */}
      {commentCount > 0 && <AdSlot slot="content-middle" />}

      <PositionCommentSection
        locale={locale}
        currentUserId={currentUser?.id}
        detail={{ commentCount, comments, hasMoreComments, attachments }}
        sortBy={sortBy}
        basePath={`/practice/position-memory/${position.id}`}
        sortTranslationKey="topics.positionMemory.sort"
        commentsNamespace="topics.positionMemory"
        loadMoreAction={loadMorePositionMemoryComments.bind(null, position.id, locale, sortBy)}
        thread={positionMemoryCommentThread(locale, position.id)}
        newPostForm={<NewPostForm locale={locale} positionId={position.id} />}
      />
      <RankAchievementModal locale={locale} />
    </PositionDetailLayout>
  );
}
