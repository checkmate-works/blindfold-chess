import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';
import { FiGitPullRequest } from 'react-icons/fi';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { countPendingEditRequestsForChunk } from '@/lib/chunk-edit-requests/queries';
import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
import { isChunkStatus } from '@/lib/chunks/validation';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { createClient } from '@/lib/supabase/server';

import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { HelpTourButton, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkDeleteButton } from '../_components/ChunkDeleteButton';
import { ChunkLifecycleControls } from '../_components/ChunkLifecycleControls';
import { createChunkReplyWithAttachment } from './_actions/createChunkReplyWithAttachment';
import { createChunkReplyWithFenAttachment } from './_actions/createChunkReplyWithFenAttachment';
import { toggleChunkLike } from './_actions/toggleChunkLike';
import { togglePositionLike } from './_actions/togglePositionLike';
import { NewPostForm } from './_components/NewPostForm';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  sort: parseAsString.withDefault('new'),
});

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
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    notFound();
  }

  const { sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    linkedPositions,
    commentCount,
    allComments,
    pendingEditRequestCount,
    t,
    tTopics,
    tVideo,
    tPuzzle,
    tMemory,
    tChunks,
    tEditRequests,
  ] = await Promise.all([
    getLinkedPositionsForChunk(chunk.id),
    getPostCountByTopicKey('chunk', slug),
    getCommentTreeForTopic('chunk', slug, user?.id),
    countPendingEditRequestsForChunk(chunk.id),
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
  ]);

  // Linked positions can mix puzzle and memory types. Reply meta is keyed by
  // `(topicType, topicKey)` so the two types are fetched in parallel and merged
  // into a single `Map<positionId, ReplyMeta>` — same shape as the public
  // profile page (`u/[username]`).
  const linkedPositionIds = linkedPositions.map((row) => row.position.id);
  const puzzlePositionIds = linkedPositions
    .filter((row) => row.position.type === 'puzzle')
    .map((row) => row.position.id);
  const memoryPositionIds = linkedPositions
    .filter((row) => row.position.type === 'memory')
    .map((row) => row.position.id);

  const [linkedLikeMetaMap, puzzleReplyMetaMap, memoryReplyMetaMap] = await Promise.all([
    linkedPositionIds.length > 0
      ? getPositionLikeMetaMap(linkedPositionIds, user?.id)
      : Promise.resolve(new Map()),
    puzzlePositionIds.length > 0
      ? getReplyMetaMap('position_puzzle', puzzlePositionIds)
      : Promise.resolve(new Map()),
    memoryPositionIds.length > 0
      ? getReplyMetaMap('position_memory', memoryPositionIds)
      : Promise.resolve(new Map()),
  ]);
  const linkedReplyMetaMap = new Map([...puzzleReplyMetaMap, ...memoryReplyMetaMap]);

  const commentTree = buildCommentTree(allComments, sortBy);

  // Fetch attachments for every post in the topic — top-level posts AND
  // every reply — so an attached PGN/FEN/embed/image card renders under
  // its author regardless of depth. CommentTree threads the resulting
  // Map through to every CommentNode it spawns.
  const allPostIds = allComments.map((c) => c.id);
  const attachments = allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();
  const extraContentByPostId = buildAttachmentNodeMap(
    allPostIds,
    attachments,
    tVideo('fallbackTitle')
  );

  const isOwner = !!user && user.id === chunk.userId;
  // The DB stores `status` as a varchar; an unknown value (e.g. a future
  // state shipped before this page was redeployed) degrades to
  // 'published' so the page still renders the safe defaults instead of
  // crashing.
  const status = isChunkStatus(chunk.status) ? chunk.status : 'published';
  const isDraft = status === 'draft';

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
        {
          targetId: 'chunk-edit-requests-link',
          title: tEditRequests('help.editRequests.title'),
          description: tEditRequests('help.editRequests.description'),
          side: 'bottom',
          align: 'end',
        },
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
            <HelpTourButton steps={draftHelpSteps} label={tEditRequests('help.label')} />
          </span>
        ) : undefined
      }
      locale={locale}
      breadcrumb={[{ label: 'Chunks', href: '/chunks' }, { label: chunk.title }]}
    >
      {(isOwner || isDraft) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/*
           * Edit-requests link: visible to everyone on draft chunks (the
           * destination page handles per-role UI — signed-in non-owners
           * see the form, the owner reviews, guests see a sign-in nudge).
           * Mirrors the puzzle "Fork" entry-point pattern: a small inline
           * link rather than a heavy CTA, with the pending count surfaced
           * as a badge so the owner notices new submissions at a glance.
           */}
          {isDraft && (
            <Link
              href={`/${locale}/chunks/${slug}/edit-requests`}
              data-tour-id="chunk-edit-requests-link"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <FiGitPullRequest className="h-3.5 w-3.5" aria-hidden />
              <span>{tEditRequests('linkLabel')}</span>
              {pendingEditRequestCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  {pendingEditRequestCount}
                </span>
              )}
            </Link>
          )}
          {isOwner && isDraft && (
            <Link
              href={`/${locale}/chunks/${slug}/edit`}
              className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-muted transition-colors"
            >
              {tChunks('editCta')}
            </Link>
          )}
          {isOwner && (
            <ChunkLifecycleControls
              chunkId={chunk.id}
              status={status}
              hasDescription={!!chunk.description && chunk.description.trim().length > 0}
            />
          )}
          {/*
           * Delete stays available to the owner in both draft and
           * published states. Publish is one-way and the edit page is
           * 404 for published chunks, so without this affordance an
           * owner would have no way to retire a mistakenly-published
           * chunk.
           */}
          {isOwner && <ChunkDeleteButton chunkId={chunk.id} />}
        </div>
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

      {linkedPositions.length > 0 && (
        <>
          <SectionTitle>Positions</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Problems where this chunk pattern is effective.
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
                      {isPuzzle ? 'Puzzle' : 'Memory'}
                    </span>
                  }
                />
              );
            })}
          </div>
        </>
      )}

      <SectionTitle>{t('commentsTitle')}</SectionTitle>

      {user && commentCount === 0 ? (
        <NewPostForm locale={locale} slug={slug} />
      ) : user ? (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} slug={slug} />
        </JoinConversationToggle>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={`/${locale}/sign-in`} className="text-link-primary hover:underline">
            {t('signInToComment')}
          </Link>
        </p>
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

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
