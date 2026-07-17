'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { getOptionalUser } from '@/lib/auth';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { buildPositionTopicKey } from '@/lib/repertoires/position-topic-key';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { isValidUUID } from '@/lib/validations/uuid';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { clampCommentOffset } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';

import { MoveCommentTreeBatch } from '../_components/MoveCommentTreeBatch';

/**
 * Fetch + render the next comment-tree batch for a move thread on
 * `/repertoires/[id]/lines/[lineNo]` (issue #81). Returns the batch as
 * server-rendered JSX so the client wrapper appends exactly what the page
 * itself would SSR — see `LoadMoreCommentsResult`. Sort is fixed to 'new',
 * matching the section (no sort control — per-move volume is low).
 *
 * All parameters except `offset` are bound server-side at render time
 * (`loadMoreMoveComments.bind(null, repertoireId, lineNo, ply, topicKey,
 * locale)`), but arrive over the wire like any action argument, so they are
 * re-validated here. `moveNotationLine` (which `CommentTree` needs for move
 * references) is rebuilt from the line itself via `replayRepertoireLine`,
 * and the bound `topicKey` is checked against the ply's recomputed position
 * key — a line edit between render and click shifts the positions, and
 * appending another thread's batch would be wrong.
 */
export async function loadMoreMoveComments(
  repertoireId: string,
  lineNo: number,
  ply: number,
  topicKey: string,
  locale: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  assertSupportedLocale(locale);
  const safeOffset = clampCommentOffset(offset);
  // Nothing to append, stop the loader — shared by every validation exit.
  const stop: LoadMoreCommentsResult = { node: null, hasMore: false, nextOffset: safeOffset };

  if (!isValidUUID(repertoireId) || !Number.isInteger(lineNo) || lineNo < 1) {
    return stop;
  }

  const user = await getOptionalUser();
  const data = await getRepertoireLineForViewer(repertoireId, lineNo, user?.id ?? null);
  if (!data) {
    // Repertoire or line deleted between render and click.
    return stop;
  }
  const { repertoire, line } = data;

  const { sans, positions } = replayRepertoireLine(line);
  if (!Number.isInteger(ply) || ply < 1 || ply > sans.length) {
    return stop;
  }
  if (buildPositionTopicKey(repertoireId, positions[ply].fen) !== topicKey) {
    return stop;
  }

  const moveNotationLine: MoveNotationLine = {
    moves: sans,
    startingFen: line.startingFen,
    playerColor: repertoire.side,
  };

  const { posts, hasMore } = await getCommentTreePageForTopic(
    'repertoire_move',
    topicKey,
    { sortBy: 'new', offset: safeOffset, limit: COMMENT_TREE_PAGE_SIZE },
    user?.id
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

  return {
    node: (
      <MoveCommentTreeBatch
        locale={locale}
        repertoireId={repertoireId}
        lineNo={lineNo}
        ply={ply}
        topicKey={topicKey}
        moveNotationLine={moveNotationLine}
        userId={user?.id}
        comments={posts}
        attachments={attachments}
      />
    ),
    hasMore,
    nextOffset: safeOffset + COMMENT_TREE_PAGE_SIZE,
  };
}
