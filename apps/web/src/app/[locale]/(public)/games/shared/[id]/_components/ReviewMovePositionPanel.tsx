'use client';

import type { Side } from '@blindfold-chess/types';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CreateFromPositionMenu } from './CreateFromPositionMenu';
import type { CommentUser } from './GameCommentContext';
import { GameMoveContributions } from './GameMoveContributions';

/**
 * The per-move block shown under the move list while a move position is on
 * the board: the move's PGN-style title, the create-from-position menu
 * (signed-in only, mirroring the chunk picker's gate), and that move's
 * comment / chunk-link thread.
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
}) {
  return (
    <div className="space-y-4">
      <SectionTitle>{title}</SectionTitle>

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
