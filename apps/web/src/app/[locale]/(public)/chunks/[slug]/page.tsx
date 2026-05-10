import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { createClient } from '@/lib/supabase/server';

import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
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
import { NewPostForm } from './_components/NewPostForm';
import { renderAttachment } from './_components/render-attachment';

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

  const [linkedPositions, commentCount, allComments, t, tTopics, tVideo] = await Promise.all([
    getLinkedPositionsForChunk(chunk.id),
    getPostCountByTopicKey('chunk', slug),
    getCommentTreeForTopic('chunk', slug, user?.id),
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
  ]);

  const commentTree = buildCommentTree(allComments, sortBy);

  const rootIds = commentTree.map((root) => root.id);
  const attachments = rootIds.length > 0 ? await getAttachmentsForPosts(rootIds) : new Map();
  const extraContentByRootId = new Map<string, React.ReactNode>();
  for (const root of commentTree) {
    const att = attachments.get(root.id);
    if (att) {
      extraContentByRootId.set(root.id, renderAttachment(att, tVideo('fallbackTitle')));
    }
  }

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
        <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-full" />
      </div>

      {linkedPositions.length > 0 && (
        <>
          <SectionTitle>Positions</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Problems where this chunk pattern is effective.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {linkedPositions.map((position) => {
              const positionType = parsePositionType(position.type);
              const detailPath = positionType
                ? getPositionDetailPath(positionType, position.id)
                : null;
              const cardContent = (
                <>
                  <ThemedBoardThumbnail fen={position.fen} className="w-full mb-2" />
                  <p className="text-sm font-medium truncate">{position.title}</p>
                </>
              );
              return detailPath ? (
                <Link
                  key={position.id}
                  href={`/${locale}${detailPath}`}
                  className="block p-4 rounded border border-border hover:bg-muted transition-colors"
                >
                  {cardContent}
                </Link>
              ) : (
                <div key={position.id} className="block p-4 rounded border border-border">
                  {cardContent}
                </div>
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
            extraContentByRootId={extraContentByRootId}
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
