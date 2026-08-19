import { type ReactNode, useMemo, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';
import { foldBoardVisibility } from '@/lib/games/play-settings-log';
import { hidesAnyPiece, revealPieces } from '@/lib/games/reveal-preferences';
import type { TerminationMark } from '@/lib/games/termination-mark';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { AiReplyChip } from '../_components/AiReplyChip';
import { BoardRevealToggle } from '../_components/BoardRevealToggle';
import { BoardSettingsButton } from '../_components/BoardSettingsButton';
import type { InlineBoardChessProps } from '../_components/InlineBoardView';
import { InlineBoardView } from '../_components/InlineBoardView';
import type { FormattedPgn } from '../_lib';

type BoardNavigation = {
  navigateToStart: () => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  navigateToEnd: () => void;
  navigateToPosition: (position: number) => void;
};

/**
 * Assemble the play screen's two board views. Extracted from PlayClient so
 * the orchestrator keeps only wiring and layout.
 *
 * - In-progress board: always rendered at a fixed position/size, with the
 *   blindfold expressed as a mask overlay rather than as a different layout.
 *   'always' → unmasked; 'peek' → masked until tapped (re-masks on the next
 *   move); 'never' → permanently masked. Click/drag move input is enabled
 *   whenever the board is actually visible — 'always' mode OR a revealed
 *   peek (`!boardMasked`) — on the player's turn, so a peeked board is as
 *   operable as an always-visible one.
 * - Finished board (read-only review): the board is simply visible — a
 *   finished game is being reviewed, not played, so no mask or peek. It also
 *   starts fully REVEALED: handing the game's own blindfold preferences to the
 *   final position left a player who had hidden the pieces staring at an empty
 *   board at the exact moment the game's outcome became the thing to look at.
 *   A top-right toggle switches back to the as-played view for the answer-check
 *   ("this is what I was seeing"), which is the whole point of a blindfold game.
 */
export function usePlayBoardViews({
  displayFen,
  currentFen,
  playerSide,
  effectiveFlipped,
  preferences,
  lastMove,
  movesLength,
  currentPosition,
  formattedPgn,
  navigation,
  onFlipBoard,
  boardMasked,
  onReveal,
  isPlayerTurn,
  isLoading,
  onBoardMove,
  onIllegalMove,
  aiReply,
  aiMoveNotation,
  isAiThinking,
  canEditPerGameSettings,
  onOpenSettings,
  terminationMark,
  terminationMarkLabel,
}: {
  displayFen: string | null;
  currentFen: string;
  playerSide: Side;
  effectiveFlipped: boolean;
  preferences: GamePreferences;
  lastMove: InlineBoardChessProps['lastMove'];
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgn;
  navigation: BoardNavigation;
  onFlipBoard: () => void;
  boardMasked: boolean;
  onReveal: () => void;
  isPlayerTurn: boolean;
  isLoading: boolean;
  onBoardMove: (san: string) => void;
  onIllegalMove: (attempt?: string, squares?: MoveSquares) => void;
  aiReply: { active: boolean; thinking: boolean };
  aiMoveNotation: string | null;
  isAiThinking: boolean;
  canEditPerGameSettings: boolean;
  onOpenSettings: () => void;
  /**
   * The end-of-game mark for the finished board; null while the game is in
   * progress or when the viewer has scrubbed off the final position.
   */
  terminationMark: TerminationMark | null;
  /** Localized accessible name for that mark. */
  terminationMarkLabel: string;
}): { inProgressBoardView: ReactNode; finishedBoardView: ReactNode } {
  // Only surface the on-board AI chip while the board is actually hidden (a
  // blindfold mode AND currently masked). When the board is visible — 'always'
  // mode, or a peeked-open board — the AI's move is right there on the squares,
  // so the "AI played …" / thinking chip would just be redundant clutter over a
  // readable position. Gating on `boardMasked` (not just the mode) also keeps a
  // setting change from popping the chip back over an open peek.
  const showAiReplyChip = preferences.boardVisibility !== 'always' && boardMasked;

  const canBoardMove = !boardMasked && isPlayerTurn && !isLoading && currentPosition === -1;

  // Board fields both views share. Each view then overrides the pieces it
  // renders differently (the finished one swaps `preferences` for its
  // revealed/as-played fold).
  const sharedBoard = {
    fen: displayFen || currentFen,
    playerSide,
    flipped: effectiveFlipped,
    lastMove: currentPosition === -1 ? lastMove : null,
    preferences,
  } as const;

  const sharedMoveList = { movesLength, currentPosition, formattedPgn } as const;

  const sharedNavigation = {
    onNavigateToStart: navigation.navigateToStart,
    onNavigatePrevious: navigation.navigatePrevious,
    onNavigateNext: navigation.navigateNext,
    onNavigateToEnd: navigation.navigateToEnd,
    onNavigateToPosition: navigation.navigateToPosition,
    onFlipBoard,
  } as const;

  const inProgressBoardView = (
    <InlineBoardView
      board={{
        ...sharedBoard,
        onMove: canBoardMove ? onBoardMove : undefined,
        onIllegalMove: canBoardMove ? onIllegalMove : undefined,
      }}
      moveList={sharedMoveList}
      navigation={sharedNavigation}
      visibility={{
        kind: 'always',
        mask: {
          active: boardMasked,
          dismissable: preferences.boardVisibility === 'peek',
          onReveal,
        },
      }}
      slots={{
        // AI reply surfaced on the board itself (visible without scrolling to
        // the page title): "thinking…" while computing, then the move, which
        // fades. While the chip is active it owns the board center;
        // `badgeActive` tells the mask to drop its own label so the two don't
        // stack.
        boardBadge: showAiReplyChip ? (
          <AiReplyChip
            active={aiReply.active}
            thinking={aiReply.thinking}
            aiMoveNotation={aiMoveNotation}
          />
        ) : undefined,
        badgeActive: showAiReplyChip && aiReply.active,
        // In 'always' mode the board is visible (no mask, no AI-reply chip), so
        // a slow engine looks indistinguishable from a freeze. Surface a
        // "thinking" overlay while the AI computes. In blindfold modes the
        // masked board + AiReplyChip already cover this, so this stays off there.
        aiThinking: preferences.boardVisibility === 'always' && isAiThinking,
        // Per-game settings gear, pinned to the board's top-right (move-list
        // strip end when shown, mask top-right when masked). Hidden for legacy
        // games with no per-game snapshot to edit. Game details stays in the panel.
        topRightControl: canEditPerGameSettings ? (
          <BoardSettingsButton onClick={onOpenSettings} />
        ) : undefined,
      }}
    />
  );

  // Finished-review piece visibility. Revealed by default; the toggle is only
  // offered when the game actually hid something (`hidesAnyPiece` folds the
  // board-visibility axis in, so a peek/never game counts even though its
  // per-side flags were both true).
  const [finishedRevealed, setFinishedRevealed] = useState(true);
  const canRevealFinished = hidesAnyPiece(preferences);
  const finishedPreferences = useMemo(
    () =>
      finishedRevealed
        ? revealPieces(preferences)
        : // As played: the same fold every other "as played" surface uses, so a
          // masked-board game reproduces as both sides hidden rather than as a
          // fully sighted position.
          { ...preferences, ...foldBoardVisibility(preferences) },
    [finishedRevealed, preferences]
  );

  const finishedBoardView = (
    <InlineBoardView
      board={{
        ...sharedBoard,
        preferences: finishedPreferences,
        // Nothing is hidden on a revealed board; in the as-played view the
        // pieces the player could not see are drawn as faint ghosts, which
        // reads as "you were blind to this" rather than as an empty square.
        hiddenPieceStyle: finishedRevealed ? 'absent' : 'ghost',
        terminationMark,
        terminationMarkLabel,
      }}
      moveList={sharedMoveList}
      navigation={sharedNavigation}
      // A finished game is reviewed, not played: no mask, no peek.
      visibility={{ kind: 'always' }}
      slots={{
        topRightControl: canRevealFinished ? (
          <BoardRevealToggle
            revealed={finishedRevealed}
            onToggle={() => setFinishedRevealed((prev) => !prev)}
          />
        ) : undefined,
      }}
    />
  );

  return { inProgressBoardView, finishedBoardView };
}
