'use server';

import { buildPositionTopicKey } from '@/lib/repertoires/position-topic-key';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { isValidUUID } from '@/lib/validations/uuid';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { loadMoreCommentsBase } from '@/app/[locale]/(public)/topics/_lib/load-more-comments-base';

import { moveCommentThread } from '../_lib/comment-thread';

/**
 * Fetch + render the next comment-tree batch for a move thread on
 * `/repertoires/[id]/lines/[lineNo]` (issue #81). Sort is fixed to 'new',
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
  return loadMoreCommentsBase({
    locale,
    sortBy: 'new',
    offset,
    topicType: 'repertoire_move',
    resolveWiring: async ({ viewerId, locale }) => {
      if (!isValidUUID(repertoireId) || !Number.isInteger(lineNo) || lineNo < 1) return null;

      // Line visibility is viewer-scoped — an unlisted kata's lines are
      // readable by its owner only.
      const data = await getRepertoireLineForViewer(repertoireId, lineNo, viewerId ?? null);
      if (!data) return null; // repertoire or line deleted between render and click
      const { repertoire, line } = data;

      const { sans, positions } = replayRepertoireLine(line);
      if (!Number.isInteger(ply) || ply < 1 || ply > sans.length) return null;
      if (buildPositionTopicKey(repertoireId, positions[ply].fen) !== topicKey) return null;

      return moveCommentThread({
        locale,
        repertoireId,
        lineNo,
        ply,
        topicKey,
        moveNotationLine: {
          moves: sans,
          startingFen: line.startingFen,
          playerColor: repertoire.side,
        },
      });
    },
  });
}
