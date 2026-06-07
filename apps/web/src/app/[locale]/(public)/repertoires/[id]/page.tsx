/**
 * Repertoire (型) — detail page. An interactive viewer of the repertoire's
 * lines (pick a line, step through its moves) plus a comment thread identical
 * to the puzzle / topics pages (topic_posts with topicType = 'repertoire').
 * Positions are precomputed server-side so the client viewer stays
 * chess.js-free.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getAuthenticatedUser } from '@/lib/auth';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getRepertoireForUser } from '@/lib/repertoires/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { formatMovesToPgn } from '@/app/[locale]/(public)/games/play/postmortem/_lib/format-moves-to-pgn';
import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
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
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { DeleteRepertoireButton } from '../_components/DeleteRepertoireButton';
import type { RepertoireViewerLine } from '../_components/RepertoireLineViewer';
import { RepertoireLineViewer } from '../_components/RepertoireLineViewer';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleRepertoirePostLike } from './_actions/toggleRepertoirePostLike';
import { NewPostForm } from './_components/NewPostForm';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'detail.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function RepertoireDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const tComments = await getTranslations({ locale, namespace: 'topics.repertoire' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const user = await getAuthenticatedUser();

  const data = await getRepertoireForUser(id, user.id);
  if (!data) notFound();
  const { repertoire, lines, profile } = data;

  const likeMeta = (await getRepertoireLikeMetaMap([repertoire.id], user.id)).get(
    repertoire.id
  ) ?? {
    likeCount: 0,
    likedByMe: false,
  };

  // Replay + format each line on the server (no chess.js in the client bundle).
  const viewerLines: RepertoireViewerLine[] = lines.map((line) => {
    let sans: string[] = [];
    try {
      sans = parsePgn(line.pgn);
    } catch {
      sans = [];
    }
    const positions = replayMoves(sans, line.startingFen ?? undefined).map((p) => ({
      fen: p.fen,
      lastMove: p.lastMove ?? null,
    }));
    const startField = line.startingFen?.split(' ');
    const startsAsBlack = startField?.[1] === 'b';
    const startMoveNumber = startField ? Number(startField[5]) || 1 : 1;
    const formatted = formatMovesToPgn(sans as AlgebraicNotation[], startsAsBlack, startMoveNumber);
    return { id: line.id, name: line.name, lineNo: line.seq + 1, formatted, positions };
  });

  // Comments — the same topic_posts thread the puzzle / topics pages use.
  const commentCount = await getPostCountByTopicKey('repertoire', repertoire.id);
  const allComments = await getCommentTreeForTopic('repertoire', repertoire.id, user.id);
  const commentTree = buildCommentTree(allComments, sortBy);
  const allPostIds = allComments.map((c) => c.id);
  const attachments = allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();

  return (
    <PageLayout
      title={repertoire.name}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/repertoires' }, { label: repertoire.name }]}
    >
      <SectionTitle>{t('detail.linesHeading')}</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.side_${repertoire.side}`)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.phase_${repertoire.phase}`)}
        </span>
        <span>{t('detail.lineCount', { count: lines.length })}</span>
      </div>

      {repertoire.description && (
        <p className="whitespace-pre-wrap text-foreground">{repertoire.description}</p>
      )}

      <RepertoireLineViewer
        lines={viewerLines}
        side={repertoire.side}
        repertoireId={repertoire.id}
        locale={locale}
      />

      <PositionAuthorAttribution
        profile={profile}
        displayName={resolveDisplayName(profile)}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
      />

      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <LikeButton
          postId={repertoire.id}
          locale={locale}
          topicKey=""
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="Repertoires"
        />
        <DeleteRepertoireButton id={repertoire.id} locale={locale} afterDelete="list" />
      </div>

      <SectionTitle>{tComments('commentsTitle')}</SectionTitle>

      {commentCount === 0 ? (
        <NewPostForm locale={locale} repertoireId={repertoire.id} />
      ) : (
        <JoinConversationToggle count={commentCount} joinLabel={tTopics('joinConversation')}>
          <NewPostForm locale={locale} repertoireId={repertoire.id} />
        </JoinConversationToggle>
      )}

      {commentTree.length > 0 && (
        <>
          <SortSelect
            basePath={`/repertoires/${repertoire.id}`}
            translationKey="topics.repertoire.sort"
            currentSort={sortBy}
          />
          <CommentTree
            comments={commentTree}
            locale={locale}
            topicKey={repertoire.id}
            currentUserId={user.id}
            enableSpoiler={false}
            redirectPath={`/${locale}/repertoires/${repertoire.id}`}
            toggleLikeAction={toggleRepertoirePostLike}
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
            i18n={{
              likeNamespace: 'topics.repertoire',
              replyNamespace: 'topics.repertoire.replies',
              deleteNamespace: 'topics.repertoire.deletePost',
            }}
          />
        </>
      )}
    </PageLayout>
  );
}
