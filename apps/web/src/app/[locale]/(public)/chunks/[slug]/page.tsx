import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
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
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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

  const [linkedPositions, commentCount, allComments, t, tTopics, tVideo, tPuzzle, tMemory] =
    await Promise.all([
      getLinkedPositionsForChunk(chunk.id),
      getPostCountByTopicKey('chunk', slug),
      getCommentTreeForTopic('chunk', slug, user?.id),
      getTranslations({ locale, namespace: 'topics.chunks' }),
      getTranslations({ locale, namespace: 'topics' }),
      getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
      getTranslations({ locale, namespace: 'practice.puzzle' }),
      getTranslations({ locale, namespace: 'practice.positionMemory' }),
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

  return (
    <PageLayout
      title={chunk.title}
      locale={locale}
      breadcrumb={[{ label: 'Chunks', href: '/chunks' }, { label: chunk.title }]}
    >
      {chunk.description && (
        <>
          <SectionTitle>Description</SectionTitle>
          <p className="text-muted-foreground">{chunk.description}</p>
        </>
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
