'use client';

import type { Side } from '@blindfold-chess/types';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { MoveOpsDetail } from '@/app/[locale]/(public)/games/play/_components/MoveOpsDetail';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CreateFromPositionMenu } from './CreateFromPositionMenu';
import type { CommentUser } from './GameCommentContext';
import { GameMoveContributions } from './GameMoveContributions';

/**
 * The per-move block shown under the move list while a move position is on
 * the board: the move's PGN-style title, that move's aid-usage stats (peeks /
 * undos / hints / rejected-move texts, when the player used any at this
 * exact move), the create-from-position menu (signed-in only, mirroring the
 * chunk picker's gate), and that move's comment / chunk-link thread.
 */
export function ReviewMovePositionPanel({
  title,
  locale,
  currentFen,
  continuationSan,
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
}: {
  title: string;
  locale: Locale;
  currentFen: string;
  continuationSan: string | undefined;
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

      {/* Author something from the position currently on the board —
          chunk / position-memory / puzzle. Signed-in only, mirroring the
          chunk picker's gate. */}
      {currentUser && (
        <CreateFromPositionMenu
          locale={locale}
          currentFen={currentFen}
          continuationSan={continuationSan}
        />
      )}

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
      />
    </div>
  );
}
