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
import { FiEdit2, FiGitBranch } from 'react-icons/fi';

import { getOptionalUser } from '@/lib/auth';
import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { getPositionLineageMetaById } from '@/lib/positions/queries';
import { getLinkedThemesForPosition } from '@/lib/themes/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { CommentTree } from '@/app/[locale]/(public)/topics/_components/CommentTree';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { buildAttachmentNodeMap } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { buildCommentTree } from '@/app/[locale]/(public)/topics/_lib/comment-tree';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import { RelatedTags } from '@/app/[locale]/_components/RelatedTags';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionAuthorAttribution } from '../../../_components/PositionAuthorAttribution';
import { PositionDetailLayout } from '../../../_components/PositionDetailLayout';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
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
  const tTags = await getTranslations({ locale, namespace: 'practice.tags' });
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
  const [likeMeta, relatedChunks, relatedThemes, commentCount, allComments, forkParent] =
    await Promise.all([
      getPositionLikeMeta(position.id, currentUser?.id),
      getLinkedChunksForPosition(position.id),
      getLinkedThemesForPosition(position.id, locale),
      getPostCountByTopicKey('position_puzzle', position.id),
      getCommentTreeForTopic('position_puzzle', position.id, currentUser?.id),
      position.forkedFromId
        ? getPositionLineageMetaById(position.forkedFromId)
        : Promise.resolve(null),
    ]);

  const canFork =
    currentUser != null && currentUser.id !== position.userId && position.forksDisabledAt === null;

  const commentTree = buildCommentTree(allComments, sortBy);

  // Fetch attachments for every post in the topic (root + every reply)
  // so attached PGN/FEN/embed/image cards render under each author
  // regardless of depth in the thread.
  const allPostIds = allComments.map((c) => c.id);
  const attachments = allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const extraContentByPostId = buildAttachmentNodeMap(
    allPostIds,
    attachments,
    tVideo('fallbackTitle')
  );

  return (
    <PositionDetailLayout
      title={position.title}
      locale={locale}
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

      <div className="flex justify-center">
        <Link href={`/games/new/position?fen=${encodeURIComponent(position.fen)}`}>
          <Button asChild variant="secondary" icon={<FaPlusCircle className="w-3 h-3" />}>
            {tPlay('newGameFromHere')}
          </Button>
        </Link>
      </div>

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

      <PositionAuthorAttribution
        profile={profile}
        displayName={displayName}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
      />

      {position.forkedFromId && (
        <p className="text-xs text-muted-foreground">
          <FiGitBranch className="inline h-3 w-3 mr-1" aria-hidden />
          {forkParent && forkParent.deletedAt === null ? (
            <>
              {t('detail.forkedFrom')}{' '}
              <Link
                href={`/practice/puzzle/${forkParent.id}`}
                className="underline hover:text-foreground"
              >
                {forkParent.title}
              </Link>
            </>
          ) : (
            <span>{t('detail.forkedFromDeleted')}</span>
          )}
        </p>
      )}

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

      <div className="pt-2">
        <Link href={`/practice/puzzle/${position.id}/session`}>
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} fullWidth>
            {t('detail.startSolving')}
          </Button>
        </Link>
      </div>

      <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

      {currentUser && commentCount === 0 ? (
        <NewPostForm locale={locale} positionId={position.id} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} positionId={position.id} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
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
            replyAttachmentActions={{
              pgn: createReplyWithAttachment,
              fen: createReplyWithFenAttachment,
            }}
            deletePostAction={deletePost}
            editPostAction={editPost}
            removeAttachmentAction={removePostAttachment}
            attachPgnAction={attachPostPgn}
            attachFenAction={attachPostFenFromForm}
            attachmentsByPostId={attachments}
            attachmentFallbackVideoTitle={tVideo('fallbackTitle')}
            extraContentByPostId={extraContentByPostId}
            i18n={{
              likeNamespace: 'topics.positionPuzzle',
              replyNamespace: 'topics.positionPuzzle.replies',
              deleteNamespace: 'topics.positionPuzzle.deletePost',
            }}
          />
        </>
      )}
    </PositionDetailLayout>
  );
}
