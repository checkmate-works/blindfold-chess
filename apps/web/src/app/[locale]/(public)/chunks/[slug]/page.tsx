import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BoardFrame } from '@/app/_components';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';
import { FiEdit2 } from 'react-icons/fi';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionActionsMenu } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionActionsMenu';
import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  HelpTourButton,
  LinkTabs,
  PageLayout,
  ScrollToHashOnMount,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike as toggleChunkEntityLike } from '../_actions/toggleLike';
import { ChunkDeleteButton } from '../_components/ChunkDeleteButton';
import { ChunkLifecycleControls } from '../_components/ChunkLifecycleControls';
import { ChunkCommentsTab } from './_components/ChunkCommentsTab';
import { ChunkGamesTab } from './_components/ChunkGamesTab';
import { ChunkPositionsTab } from './_components/ChunkPositionsTab';
import { EditRequestCallout } from './_components/EditRequestCallout';
import { buildDraftHelpSteps } from './_lib/build-draft-help-steps';
import { loadChunkDetail } from './_lib/load-chunk-detail';
import { resolveChunkDisplayState } from './_lib/resolve-chunk-display-state';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  sort: parseAsString.withDefault('new'),
  // No default here: an absent `tab` param must be distinguishable from an
  // explicit `?tab=positions` so we can fall back to the first non-empty tab
  // (see `resolveDefaultChunkTab`). Validated against `TAB_VALUES` below.
  tab: parseAsString,
});

const TAB_VALUES = ['positions', 'games', 'comments'] as const;
type ChunkTab = (typeof TAB_VALUES)[number];

/**
 * Pick the tab to open when the URL carries no (or an invalid) `?tab=`.
 *
 * Positions is the chunk's primary training content, so it wins whenever it
 * has any items. But a freshly-created chunk often has zero positions while
 * already carrying comments (e.g. a notification deep-links a commenter back
 * here): defaulting to the empty Positions panel would hide the content the
 * visitor came for. Fall through to the first tab that actually has something,
 * in priority order, and only land on the empty Positions tab when every tab
 * is empty.
 */
function resolveDefaultChunkTab(counts: {
  positions: number;
  games: number;
  comments: number;
}): ChunkTab {
  if (counts.positions > 0) return 'positions';
  if (counts.games > 0) return 'games';
  if (counts.comments > 0) return 'comments';
  return 'positions';
}

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    return {
      title: resolveTitle('Not Found', locale),
    };
  }

  return {
    title: resolveTitle(chunk.title, locale),
    ...(chunk.description && { description: chunk.description }),
    ...generateCanonicalMetadata({
      locale,
      path: `chunks/${slug}`,
      title: chunk.title,
      description: chunk.description ?? undefined,
    }),
  };
}

export default async function ChunkDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { sort, tab } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const data = await loadChunkDetail(slug, user?.id, sortBy);
  const {
    chunk,
    profile,
    linkedPositions,
    commentCount,
    comments,
    hasMoreComments,
    pendingEditRequestCount,
    requestedFeedbackTopics,
    viewerPendingRequestId,
    chunkLikeMeta,
    linkedLikeMetaMap,
    linkedReplyMetaMap,
    attachments,
    relatedGames,
    relatedGamesLikeMetaMap,
    relatedGamesReplyMetaMap,
  } = data;

  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  const displayName = resolveAuthorName(profile, { fallback: tCommon('deletedUser') });

  const activeTab: ChunkTab =
    tab && TAB_VALUES.includes(tab as ChunkTab)
      ? (tab as ChunkTab)
      : resolveDefaultChunkTab({
          positions: linkedPositions.length,
          games: relatedGames.length,
          comments: commentCount,
        });

  const [t, tChunks, tEditRequests] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
  ]);

  const { status, isDraft, isOwner, calloutViewerState, showEditRequestCallout } =
    resolveChunkDisplayState({
      chunkStatus: chunk.status,
      chunkUserId: chunk.userId,
      viewerUserId: user?.id,
      viewerHasPendingEditRequest: !!viewerPendingRequestId,
      pendingEditRequestCount,
    });

  const draftHelpSteps = isDraft ? buildDraftHelpSteps(tEditRequests, showEditRequestCallout) : [];

  return (
    <PageLayout
      title={chunk.title}
      titleAction={
        isDraft ? (
          <span className="inline-flex items-center gap-2">
            <span
              data-tour-id="chunk-draft-badge"
              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100"
            >
              {tChunks('statusDraft')}
            </span>
            {/*
             * Help tour is for visitors who need to be told what a draft
             * means and where to suggest changes — content the owner of
             * the draft does not need (they wrote it and there is
             * nothing for them to "suggest"). Hiding the trigger for
             * the owner also avoids the missing-target degradation in
             * the owner+0-pending case where the callout (step 2's
             * spotlight) is intentionally not rendered.
             */}
            {!isOwner && (
              <HelpTourButton steps={draftHelpSteps} label={tEditRequests('help.label')} />
            )}
          </span>
        ) : undefined
      }
      locale={locale}
      breadcrumb={[{ label: tChunks('listTitle'), href: '/chunks' }, { label: chunk.title }]}
    >
      <ScrollToHashOnMount />
      {/*
       * Edit-suggestion callout — only meaningful while the chunk is in
       * draft. Hoisted to the very top of the content area so the
       * "this is a workshop state, suggestions welcome" framing is the
       * first thing visitors see before they scroll into the catalog
       * content. The layout-uniformity cost (a non-SectionTitle element
       * preceding the first SectionTitle) is bounded because the
       * callout only renders in the draft state; mirrors the
       * articles `/[slug]` fallback-locale notice pattern.
       */}
      {showEditRequestCallout && (
        <EditRequestCallout
          locale={locale}
          slug={slug}
          pendingCount={pendingEditRequestCount}
          body={tEditRequests('callout.body')}
          ownerBody={
            pendingEditRequestCount > 0
              ? tEditRequests('callout.ownerBodyWithPending', {
                  count: pendingEditRequestCount,
                })
              : tEditRequests('callout.ownerBodyEmpty')
          }
          ctaByState={{
            owner: tEditRequests('callout.ctaOwner'),
            hasPending: tEditRequests('callout.ctaHasPending'),
            canSuggest: tEditRequests('callout.ctaCanSuggest'),
            signedOut: tEditRequests('callout.ctaSignedOut'),
          }}
          viewerState={calloutViewerState}
          requestedTopicLabels={requestedFeedbackTopics.map((topic) =>
            tEditRequests(`callout.topicLabels.${topic}` as 'callout.topicLabels.title')
          )}
          topicLeadIn={tEditRequests('callout.topicLeadIn')}
        />
      )}

      {/*
       * Render the Description section unconditionally — drafts can
       * legitimately ship without a description while their title is
       * still being workshopped, but the section title gives a visible
       * anchor (and an obvious "missing" placeholder) so the page
       * structure stays consistent with other detail surfaces.
       */}
      <SectionTitle>{tChunks('detail.descriptionSection')}</SectionTitle>
      {chunk.description ? (
        <p className="text-foreground whitespace-pre-wrap">{chunk.description}</p>
      ) : (
        <p className="text-muted-foreground italic">{tChunks('detail.noDescription')}</p>
      )}

      <BoardFrame expandOnMobile>
        <ThemedBoardThumbnail
          fen={chunk.representativeFen}
          annotations={parseBoardAnnotations(chunk.annotations)}
          className="w-full"
        />
      </BoardFrame>

      {/*
       * SNS-style author block — "Created by" caption, avatar + name with
       * the created / edited timestamp underneath, and (for the owner) a
       * "⋯" overflow menu carrying Edit / Publish / Delete. This is the
       * canonical "owner actions" surface for the page rather than
       * scattering controls near the title. Delete stays available in both
       * draft and published states — publish is one-way and the edit page
       * is 404 once published, so without it the owner has no way to
       * retire a mistakenly-published chunk.
       */}
      <PositionAuthorHeader
        profile={profile}
        displayName={displayName}
        createdByLabel={tChunks('detail.createdBy')}
        locale={locale}
        createdAt={chunk.createdAt}
        edited={chunk.updatedAt.getTime() - chunk.createdAt.getTime() > 1000}
        editedLabel={tChunks('detail.edited')}
        menu={
          isOwner ? (
            <PositionActionsMenu
              ariaLabel={tChunks('detail.moreActions')}
              items={
                isDraft
                  ? [
                      {
                        key: 'edit',
                        label: tChunks('editCta'),
                        href: `/${locale}/chunks/${slug}/edit`,
                        icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
                      },
                    ]
                  : []
              }
            >
              <ChunkLifecycleControls
                chunkId={chunk.id}
                chunkSlug={chunk.slug}
                status={status}
                hasDescription={!!chunk.description && chunk.description.trim().length > 0}
              />
              <ChunkDeleteButton chunkId={chunk.id} />
            </PositionActionsMenu>
          ) : undefined
        }
      />

      {/*
       * Chunk-entity like — same slot as the puzzle / position-memory
       * detail pages. `topics.chunks` is the same i18n namespace the
       * home-feed ChunkFeedCard uses for its like affordance, so the label
       * copy stays consistent across surfaces.
       */}
      <div className="flex items-center text-xs text-muted-foreground">
        <LikeButton
          postId={chunk.id}
          locale={locale}
          topicKey=""
          initialLikeCount={chunkLikeMeta.likeCount}
          initialLikedByMe={chunkLikeMeta.likedByMe}
          toggleLikeAction={toggleChunkEntityLike}
          i18nNamespace="topics.chunks"
        />
      </div>

      {/*
       * The chunk's three secondary surfaces — the positions that use this
       * pattern, the games it shows up in, and the comment thread — each want
       * the bottom of the page; tab between them (underline style, shared with
       * the profile / games-list tabs) instead of stacking. The active tab is a
       * `?tab=` query param so each panel is server-rendered on demand and a
       * shared link reopens on the right tab — the same navigation style as the
       * comment `?sort=` control below. With no `?tab=`, Positions opens by
       * default (the chunk's primary training content), falling through to the
       * first non-empty tab when Positions is empty (`resolveDefaultChunkTab`).
       * All three tabs always render so the tab set is stable and the count
       * tells you what's inside.
       */}
      {/*
       * `id` + `scroll-mt-20`: lets a link from elsewhere (e.g. the home feed's
       * comment-count icon) land on this tab bar via `#chunk-tabs` instead of
       * the top of the page — the tabs sit well below the description/board/
       * metadata block above.
       */}
      <div id="chunk-tabs" className="scroll-mt-20">
        <LinkTabs
          variant="underline"
          locale={locale}
          activeValue={activeTab}
          scroll={false}
          aria-label={t('relatedGames.tabsLabel')}
          items={[
            {
              value: 'positions',
              // Explicit `?tab=positions` (not the bare slug) so this tab always
              // lands on the Positions panel. The bare URL resolves to the first
              // non-empty tab (`resolveDefaultChunkTab`), so on a chunk with zero
              // positions a bare-URL link here would loop back to Comments.
              label: `${tChunks('detail.positionsSection')} (${linkedPositions.length})`,
              href: `/chunks/${slug}?tab=positions`,
            },
            {
              value: 'games',
              label: `${t('relatedGames.tab')} (${relatedGames.length})`,
              href: `/chunks/${slug}?tab=games`,
            },
            {
              value: 'comments',
              label: `${t('commentsTitle')} (${commentCount})`,
              href: `/chunks/${slug}?tab=comments`,
            },
          ]}
        />
      </div>

      {activeTab === 'positions' && (
        <ChunkPositionsTab
          locale={locale}
          chunkSlug={chunk.slug}
          linkedPositions={linkedPositions}
          likeMetaMap={linkedLikeMetaMap}
          replyMetaMap={linkedReplyMetaMap}
        />
      )}

      {activeTab === 'games' && (
        <ChunkGamesTab
          locale={locale}
          games={relatedGames}
          likeMetaMap={relatedGamesLikeMetaMap}
          replyMetaMap={relatedGamesReplyMetaMap}
        />
      )}

      {activeTab === 'comments' && (
        <ChunkCommentsTab
          locale={locale}
          slug={slug}
          userId={user?.id}
          commentCount={commentCount}
          comments={comments}
          hasMoreComments={hasMoreComments}
          attachments={attachments}
          sortBy={sortBy}
          representativeFen={chunk.representativeFen}
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
