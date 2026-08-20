'use client';

import { useMemo, useState } from 'react';

import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';
import { foldBoardVisibility } from '@/lib/games/play-settings-log';
import { hidesAnyPiece, revealPieces } from '@/lib/games/reveal-preferences';

import { BoardRevealToggle } from '@/app/[locale]/(public)/games/play/_components/BoardRevealToggle';
import { BoardSettingsButton } from '@/app/[locale]/(public)/games/play/_components/BoardSettingsButton';
import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { RecallOpponentMoveChip } from '../_components/RecallOpponentMoveChip';

type Params = {
  boardFen: string;
  playerColor: Side;
  /** Last move to highlight, already gated on "browsing the latest position". */
  lastMove: MoveSquares | null;
  /** The review's local (ephemeral) preferences — see useRecallPreferences. */
  preferences: GamePreferences;
  originalMovesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
  navigation: {
    navigateToStart: () => void;
    navigatePrevious: () => void;
    navigateNext: () => void;
    navigateToEnd: () => void;
  };
  /** Whether the blindfold mask is currently up (in-progress view only). */
  boardMaskActive: boolean;
  maskDismissable: boolean;
  onReveal: () => void;
  canBoardInput: boolean;
  onSubmitMove: (san: AlgebraicNotation) => void;
  onOpenSettings: () => void;
  /** Opponent auto-move announcement chip — see useOpponentMoveAnnouncement. */
  showOpponentChip: boolean;
  opponentChipActive: boolean;
  opponentMoveNotation: string | null;
};

/**
 * Build the recall review's two board views, mirroring play's
 * `usePlayBoardViews` split: the in-progress view carries the blindfold mask,
 * board input, and the settings gear; the finished (summary) view swaps
 * `preferences` for its revealed/as-played fold and replaces the gear with a
 * reveal ⇄ as-played toggle.
 *
 * The gear must not survive completion: recall's Change Log anchors setting
 * edits to `currentMoveIndex` (see useRecallPreferences), which no longer
 * advances once the review is done, so a post-completion edit would show up
 * in the summary's Change Log stamped at the final move — as if it had
 * happened during the session.
 *
 * `finishedPreferences` / `finishedHiddenPieceStyle` are returned as data too,
 * so the quick-peek modal can follow the same reveal state as the board.
 */
export function useRecallBoardViews({
  boardFen,
  playerColor,
  lastMove,
  preferences,
  originalMovesLength,
  currentPosition,
  formattedPgn,
  navigation,
  boardMaskActive,
  maskDismissable,
  onReveal,
  canBoardInput,
  onSubmitMove,
  onOpenSettings,
  showOpponentChip,
  opponentChipActive,
  opponentMoveNotation,
}: Params) {
  // Board props shared by the in-progress and finished views — the finished
  // one swaps `preferences` for its revealed/as-played fold and drops the
  // mask, the input, and the gear.
  const sharedBoard = {
    fen: boardFen,
    playerSide: playerColor,
    lastMove,
    // The reviewer enters BOTH sides' moves, so the opponent's pieces must
    // be grabbable on the opponent's turn.
    movablePieces: 'side-to-move',
  } as const;

  const sharedMoveList = {
    movesLength: originalMovesLength,
    currentPosition,
    formattedPgn,
  } as const;

  const sharedNavigation = {
    onNavigateToStart: navigation.navigateToStart,
    onNavigatePrevious: navigation.navigatePrevious,
    onNavigateNext: navigation.navigateNext,
    onNavigateToEnd: navigation.navigateToEnd,
  } as const;

  const inProgressBoardView = (
    <InlineBoardView
      board={{
        ...sharedBoard,
        preferences,
        onMove: canBoardInput ? (san) => onSubmitMove(san as AlgebraicNotation) : undefined,
      }}
      moveList={sharedMoveList}
      navigation={sharedNavigation}
      visibility={{
        kind: 'always',
        mask: {
          active: boardMaskActive,
          dismissable: maskDismissable,
          onReveal,
        },
      }}
      slots={{
        // Settings gear pinned to the board's top-right corner, matching
        // games/play's BoardSettingsButton placement exactly (recall has no
        // legacy-game gate on editability, so it's always shown here).
        topRightControl: (
          <BoardSettingsButton onClick={onOpenSettings} dataTourId="recall-settings" />
        ),
        boardBadge: showOpponentChip ? (
          <RecallOpponentMoveChip active={opponentChipActive} moveNotation={opponentMoveNotation} />
        ) : undefined,
        badgeActive: showOpponentChip && opponentChipActive,
      }}
    />
  );

  // Finished-review piece visibility, mirroring play's finishedBoardView:
  // revealed by default, with an as-played toggle offered only when the
  // session actually hid something.
  const [finishedRevealed, setFinishedRevealed] = useState(true);
  const canRevealFinished = hidesAnyPiece(preferences);
  const finishedPreferences = useMemo(
    () =>
      finishedRevealed
        ? revealPieces(preferences)
        : // As played: the same fold every other "as played" surface uses, so a
          // masked-board review reproduces as both sides hidden rather than as
          // a fully sighted position.
          { ...preferences, ...foldBoardVisibility(preferences) },
    [finishedRevealed, preferences]
  );
  // In the as-played view the pieces the reviewer could not see are drawn as
  // faint ghosts, which reads as "you were blind to this" rather than as an
  // empty square (same choice as play's finished view).
  const finishedHiddenPieceStyle = finishedRevealed ? ('absent' as const) : ('ghost' as const);

  const finishedBoardView = (
    <InlineBoardView
      board={{
        ...sharedBoard,
        preferences: finishedPreferences,
        hiddenPieceStyle: finishedHiddenPieceStyle,
      }}
      moveList={sharedMoveList}
      navigation={sharedNavigation}
      // A completed review is browsed, not played: no mask, no peek.
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

  return { inProgressBoardView, finishedBoardView, finishedPreferences, finishedHiddenPieceStyle };
}
