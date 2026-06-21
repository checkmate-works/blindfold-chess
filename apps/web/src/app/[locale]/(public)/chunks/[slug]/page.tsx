import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';
import { FiEdit2 } from 'react-icons/fi';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { HelpTourButton, LinkTabs, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike as toggleChunkEntityLike } from '../_actions/toggleLike';
import { ChunkDeleteButton } from '../_components/ChunkDeleteButton';
import { ChunkLifecycleControls } from '../_components/ChunkLifecycleControls';
import { createChunkReplyWithAttachment } from './_actions/createChunkReplyWithAttachment';
import { createChunkReplyWithFenAttachment } from './_actions/createChunkReplyWithFenAttachment';
import { toggleChunkLike } from './_actions/toggleChunkLike';
import { togglePositionLike } from './_actions/togglePositionLike';
import { EditRequestCallout } from './_components/EditRequestCallout';
import { NewPostForm } from './_components/NewPostForm';
import { RelatedGamesList } from './_components/RelatedGamesList';
import { EMPTY_REPLY_META, loadChunkDetail } from './_lib/load-chunk-detail';
import { resolveChunkDisplayState } from './_lib/resolve-chunk-display-state';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  sort: parseAsString.withDefault('new'),
  tab: parseAsString.withDefault('positions'),
});

const TAB_VALUES = ['positions', 'games', 'comments'] as const;
type ChunkTab = (typeof TAB_VALUES)[number];

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

  const data = await loadChunkDetail(slug, user?.id);
  const {
    chunk,
    profile,
    linkedPositions,
    commentCount,
    allComments,
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

  const { sort, tab } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);
  const activeTab: ChunkTab = TAB_VALUES.includes(tab as ChunkTab)
    ? (tab as ChunkTab)
    : 'positions';

  const [
    t,
    tTopics,
    tVideo,
    tPuzzle,
    tMemory,
    tChunks,
    tEditRequests,
    tSharedGames,
    tPlay,
    tOpeningNames,
  ] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
    getTranslations({ locale, namespace: 'sharedGames' }),
    getTranslations({ locale, namespace: 'play' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
  ]);

  const commentTree = buildCommentTree(allComments, sortBy);

  // CommentTree threads `extraContentByPostId` through to every
  // CommentNode it spawns so attached PGN/FEN/embed/image cards render
  // under their author at any depth. Building it requires the video
  // fallback label, which is why it's done here in the page (where
  // translations live) rather than inside `loadChunkDetail`.
  const allPostIds = allComments.map((c) => c.id);
  const extraContentByPostId = buildAttachmentNodeMap(
    allPostIds,
    attachments,
    tVideo('fallbackTitle')
  );

  const { status, isDraft, isOwner, calloutViewerState, showEditRequestCallout } =
    resolveChunkDisplayState({
      chunkStatus: chunk.status,
      chunkUserId: chunk.userId,
      viewerUserId: user?.id,
      viewerHasPendingEditRequest: !!viewerPendingRequestId,
      pendingEditRequestCount,
    });

  // Help-tour steps for the draft state — mirrors the home / practice
  // convention (HelpTourButton + data-tour-id on the target elements).
  // Drafts get a brief walkthrough explaining the "edit suggestions"
  // workflow that's unique to this lifecycle; published chunks render
  // no help button since the page is then just a standard catalog entry.
  const draftHelpSteps: HelpStep[] = isDraft
    ? [
        {
          targetId: 'chunk-draft-badge',
          title: tEditRequests('help.badge.title'),
          description: tEditRequests('help.badge.description'),
          side: 'bottom',
          align: 'center',
        },
        // The second step highlights the callout's CTA, so it only
        // makes sense when the callout actually renders. Skip it
        // when the callout is suppressed (owner viewing an empty
        // queue) so the tour does not point at a missing element.
        ...(showEditRequestCallout
          ? [
              {
                targetId: 'chunk-edit-requests-link',
                title: tEditRequests('help.editRequests.title'),
                description: tEditRequests('help.editRequests.description'),
                side: 'bottom' as const,
                align: 'end' as const,
              },
            ]
          : []),
      ]
    : [];

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

      <div className="max-w-xs mx-auto">
        <ThemedBoardThumbnail
          fen={chunk.representativeFen}
          annotations={parseBoardAnnotations(chunk.annotations)}
          className="w-full"
        />
      </div>

      <PositionAuthorAttribution
        profile={profile}
        displayName={displayName}
        createdByLabel={tChunks('detail.createdBy')}
        locale={locale}
      />

      {/*
       * Bottom metadata row — mirrors the layout used by
       * `/practice/puzzle/[id]` and `/practice/position-memory/[id]`.
       * Inline-link styled affordances (Edit suggestions, Edit,
       * Publish, Delete) sit on the right with the chunk's created /
       * edited timestamp; this is the canonical "owner + visitor
       * actions" surface for the page rather than scattering controls
       * near the title.
       */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        {/*
         * Chunk-entity like — sits on the left of the metadata row, the
         * same slot the puzzle / position-memory detail pages place their
         * LikeButton (`/practice/puzzle/[id]`,
         * `/practice/position-memory/[id]`). `topics.chunks` is the same
         * i18n namespace the home-feed ChunkFeedCard uses for its like
         * affordance, so the label copy stays consistent across surfaces.
         */}
        <LikeButton
          postId={chunk.id}
          locale={locale}
          topicKey=""
          initialLikeCount={chunkLikeMeta.likeCount}
          initialLikedByMe={chunkLikeMeta.likedByMe}
          toggleLikeAction={toggleChunkEntityLike}
          i18nNamespace="topics.chunks"
        />
        <div className="flex flex-wrap items-center justify-end gap-4">
          {isOwner && isDraft && (
            <Link
              href={`/${locale}/chunks/${slug}/edit`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
            >
              <FiEdit2 className="h-3 w-3" aria-hidden />
              {tChunks('editCta')}
            </Link>
          )}
          {isOwner && (
            <ChunkLifecycleControls
              chunkId={chunk.id}
              chunkSlug={chunk.slug}
              status={status}
              hasDescription={!!chunk.description && chunk.description.trim().length > 0}
            />
          )}
          {/*
           * Delete stays available to the owner in both draft and
           * published states — publish is one-way and the edit page is
           * 404 once published, so without this control the owner has
           * no way to retire a mistakenly-published chunk.
           */}
          {isOwner && <ChunkDeleteButton chunkId={chunk.id} />}
          <time dateTime={chunk.createdAt.toISOString()}>
            {chunk.createdAt.toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {chunk.updatedAt.getTime() - chunk.createdAt.getTime() > 1000 && (
            <span>{tChunks('detail.edited')}</span>
          )}
        </div>
      </div>

      {/*
       * The chunk's three secondary surfaces — the positions that use this
       * pattern, the games it shows up in, and the comment thread — each want
       * the bottom of the page; tab between them (underline style, shared with
       * the profile / games-list tabs) instead of stacking. The active tab is a
       * `?tab=` query param so each panel is server-rendered on demand and a
       * shared link reopens on the right tab — the same navigation style as the
       * comment `?sort=` control below. Positions is the default (the chunk's
       * primary training content); all three tabs always render so the tab set
       * is stable and the count tells you what's inside.
       */}
      <LinkTabs
        variant="underline"
        locale={locale}
        activeValue={activeTab}
        scroll={false}
        aria-label={t('relatedGames.tabsLabel')}
        items={[
          {
            value: 'positions',
            label: `${tChunks('detail.positionsSection')} (${linkedPositions.length})`,
            href: `/chunks/${slug}`,
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

      {activeTab === 'positions' &&
        (linkedPositions.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {tChunks('detail.positionsDescription')}
            </p>
            <div className="space-y-3">
              {linkedPositions.map(({ position, profile }) => {
                const positionType = parsePositionType(position.type);
                const detailPath = positionType
                  ? getPositionDetailPath(positionType, position.id)
                  : null;
                if (!detailPath) return null;

                const isPuzzle = position.type === 'puzzle';
                return (
                  <PositionListCard
                    key={position.id}
                    position={position}
                    profile={profile}
                    likeMeta={
                      linkedLikeMetaMap.get(position.id) ?? { likeCount: 0, likedByMe: false }
                    }
                    replyMeta={linkedReplyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
                    detailHref={detailPath}
                    i18nNamespace={isPuzzle ? 'practice.puzzle' : 'practice.positionMemory'}
                    toggleLikeAction={togglePositionLike}
                    justNowLabel={isPuzzle ? tPuzzle('justNow') : tMemory('justNow')}
                    locale={locale}
                    badge={
                      <span
                        className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                          isPuzzle
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}
                      >
                        {isPuzzle
                          ? tChunks('detail.positionBadge.puzzle')
                          : tChunks('detail.positionBadge.memory')}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{tChunks('detail.positionsEmpty')}</p>
        ))}

      {activeTab === 'games' && (
        <>
          {relatedGames.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {tChunks('detail.relatedGamesDescription')}
            </p>
          )}
          <RelatedGamesList
            games={relatedGames}
            likeMetaMap={relatedGamesLikeMetaMap}
            replyMetaMap={relatedGamesReplyMetaMap}
            emptyReplyMeta={EMPTY_REPLY_META}
            locale={locale}
            justNowLabel={tSharedGames('detail.justNow')}
            colorLabels={{
              white: tPlay('playerColor.white'),
              black: tPlay('playerColor.black'),
            }}
            resolveOpeningName={(slug, fallbackName) =>
              getOpeningDisplayName(tOpeningNames, slug, fallbackName)
            }
            emptyLabel={t('relatedGames.empty')}
            moveLabel={(n) => t('relatedGames.moveLabel', { n })}
          />
        </>
      )}

      {activeTab === 'comments' && (
        <>
          {/*
           * Logged-out users get the same "Join the conversation" button as
           * every other comment surface (puzzle / position-memory / repertoire
           * / topic posts) — JoinConversationToggle's auth guard opens the
           * "sign in to continue" modal on click — instead of a bespoke
           * inline sign-in link. The dedicated `commentCount === 0` form is
           * kept only for the signed-in author so they can post the first
           * comment without a click.
           */}
          {user && commentCount === 0 ? (
            <NewPostForm locale={locale} slug={slug} />
          ) : (
            <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
              <NewPostForm locale={locale} slug={slug} />
            </JoinConversationToggle>
          )}

          {commentTree.length > 0 && (
            <>
              <SortSelect
                basePath={`/chunks/${slug}`}
                translationKey="topics.chunks.sort"
                currentSort={sortBy}
              />
              <CommentTree
                comments={commentTree}
                locale={locale}
                topicKey={slug}
                currentUserId={user?.id}
                enableSpoiler={false}
                redirectPath={`/${locale}/chunks/${slug}`}
                toggleLikeAction={toggleChunkLike}
                replyAttachmentActions={{
                  pgn: createChunkReplyWithAttachment,
                  fen: createChunkReplyWithFenAttachment,
                }}
                deletePostAction={deletePost}
                extraContentByPostId={extraContentByPostId}
                i18n={{
                  likeNamespace: 'topics.chunks',
                  replyNamespace: 'topics.chunks.replies',
                  deleteNamespace: 'topics.chunks.deletePost',
                }}
              />
            </>
          )}
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
