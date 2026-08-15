'use client';

import type { Side } from '@blindfold-chess/types';

import type { AiReviewMomentComment, ReviewMoment } from '@/lib/ai-review/types';
import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { MoveOpsDetail } from '@/app/[locale]/(public)/games/play/_components/MoveOpsDetail';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { CommentUser } from './GameCommentContext';
import { GameMoveContributions } from './GameMoveContributions';

/**
 * The per-move block shown below the board while a move position is on it: the
 * move's PGN-style title, that move's aid-usage stats (peeks / undos / hints /
 * rejected-move texts, when the player used any at this exact move), and that
 * move's thread — advice comments, chunk links, and the AI review's own take
 * on the move when it flagged one.
 *
 * Authoring from the displayed position lives in the board's own control strip
 * (see `CreateFromPositionMenu`), not here — it tracks the board, not the move
 * being discussed.
 */
export function ReviewMovePositionPanel({
  title,
  locale,
  gameId,
  currentPly,
  comments,
  gameChunks,
  availableChunks,
  currentUser,
  isGameOwner,
  moves,
  startingFen,
  playerColor,
  moveOperationLog,
  onAttemptSelect,
  selectedAttemptIndex,
  isAttemptSelectable,
  aiReviewMoment,
}: {
  title: string;
  locale: Locale;
  gameId: string;
  currentPly: number;
  comments: GameCommentItem[];
  gameChunks: GameChunkItem[];
  availableChunks: ChunkOption[];
  currentUser: CommentUser | null;
  isGameOwner: boolean;
  moves: string[];
  startingFen: string | null;
  playerColor: Side;
  /**
   * This move's operation log — peek / undo / hint counts and the rejected
   * SAN texts behind `invalidCount` (see `MoveOperationLog.invalidAttempts`).
   * Null for a non-player move (e.g. the AI's) or a legacy game with no
   * recorded log. Only rendered when it has at least one non-zero counter.
   */
  moveOperationLog: MoveOperationLog | null;
  /**
   * Relayed to {@link MoveOpsDetail}: tapping a rejected-move chip marks that
   * attempt on the replay board (this panel and the board are siblings under
   * `GameReview`, which owns the selection).
   */
  onAttemptSelect?: (attemptIndex: number) => void;
  selectedAttemptIndex?: number | null;
  isAttemptSelectable?: (attemptIndex: number) => boolean;
  /**
   * The AI review's take on THIS move, when it selected it as a critical
   * moment (most moves are not). Relayed to the thread below, where it reads
   * as one more comment. `comment` is absent when the review's prose skipped a
   * moment its engine pass kept.
   */
  aiReviewMoment?: {
    moment: ReviewMoment;
    comment?: AiReviewMomentComment;
    createdAt: Date;
  } | null;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle>{title}</SectionTitle>

      {/* This move's aid-usage stats — most notably what SAN the player
          actually tried when an illegal-move attempt was rejected here.
          Self-hiding when the move has nothing notable (the common case).
          Shared verbatim with the local result screen (see MoveOpsDetail). */}
      <MoveOpsDetail
        moveOperationLog={moveOperationLog}
        onAttemptSelect={onAttemptSelect}
        selectedAttemptIndex={selectedAttemptIndex}
        isAttemptSelectable={isAttemptSelectable}
      />

      {/* Posted comments and chunk links shown serially; only the
          composer (post a comment vs link a chunk) is toggled. */}
      <GameMoveContributions
        gameId={gameId}
        currentPly={currentPly}
        comments={comments}
        gameChunks={gameChunks}
        availableChunks={availableChunks}
        currentUser={currentUser}
        isGameOwner={isGameOwner}
        locale={locale}
        moves={moves}
        startingFen={startingFen}
        playerColor={playerColor}
        aiReviewMoment={aiReviewMoment}
      />
    </div>
  );
}
