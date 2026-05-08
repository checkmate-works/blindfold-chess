import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { FaPlusCircle } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

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
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { RelatedChunks } from '@/app/[locale]/_components/RelatedChunks';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionAuthorAttribution } from '../../_components/PositionAuthorAttribution';
import { PositionDetailLayout } from '../../_components/PositionDetailLayout';
import { toggleLike } from '../_actions/toggleLike';
import { DeletePositionButton } from '../_components/DeletePositionButton';
import { PositionDetailBoard } from '../_components/single-position/PositionDetailBoard';
import { PositionStartForm } from '../_components/single-position/PositionStartForm';
import { createReply } from './_actions/createReply';
import { togglePositionMemoryPostLike } from './_actions/togglePositionMemoryPostLike';
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
  const tComments = await getTranslations({ locale, namespace: 'topics.positionMemory' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveDisplayName(profile);
  const isBlackToMove = isBlackToMoveFromFen(position.fen);

  const currentUser = await getOptionalUser();
  const [likeMeta, relatedChunks, commentCount, allComments] = await Promise.all([
    getPositionLikeMeta(position.id, currentUser?.id),
    getLinkedChunksForPosition(position.id),
    getPostCountByTopicKey('position_memory', position.id),
    getCommentTreeForTopic('position_memory', position.id, currentUser?.id),
  ]);

  const commentTree = buildCommentTree(allComments, sortBy);

  return (
    <PositionDetailLayout
      title={position.title}
      locale={locale}
      bottomAdSense={
        (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )
      }
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

      <div className="max-w-md mx-auto">
        <PositionDetailBoard fen={position.fen} flipped={isBlackToMove} />
        <div className="flex justify-center mt-4">
          <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
            <Button asChild variant="secondary" icon={<FaPlusCircle className="w-3 h-3" />}>
              {tPlay('newGameFromHere')}
            </Button>
          </Link>
        </div>
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
          i18nNamespace="practice.positionMemory"
        />
        <div className="flex items-center gap-4">
          {currentUser?.id === position.userId && (
            <>
              <Link
                href={`/practice/position-memory/${position.id}/edit`}
                className="hover:text-foreground transition-colors"
              >
                {t('detail.editAction')}
              </Link>
              <DeletePositionButton positionId={position.id} locale={locale} />
            </>
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

      <SectionTitle>{t('detail.solveSection')}</SectionTitle>

      <PositionStartForm positionId={position.id} locale={locale} />

      <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

      {currentUser && commentCount === 0 ? (
        <NewPostForm locale={locale} positionId={position.id} />
      ) : (
        <JoinConversationToggle
          countText={tComments('postCount', { count: commentCount })}
          joinLabel={tTopics('joinConversation')}
        >
          <NewPostForm locale={locale} positionId={position.id} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
        <>
          <SortSelect
            basePath={`/practice/position-memory/${position.id}`}
            translationKey="topics.positionMemory.sort"
            currentSort={sortBy}
          />
          <CommentTree
            comments={commentTree}
            locale={locale}
            topicKey={position.id}
            currentUserId={currentUser?.id}
            enableSpoiler={false}
            redirectPath={`/${locale}/practice/position-memory/${position.id}`}
            toggleLikeAction={togglePositionMemoryPostLike}
            createReplyAction={createReply}
            deletePostAction={deletePost}
            i18n={{
              likeNamespace: 'topics.positionMemory',
              replyNamespace: 'topics.positionMemory.replies',
              deleteNamespace: 'topics.positionMemory.deletePost',
            }}
          />
        </>
      )}
    </PositionDetailLayout>
  );
}
