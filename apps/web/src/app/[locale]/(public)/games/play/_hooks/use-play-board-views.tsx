import type { ComponentProps, ReactNode } from 'react';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { AiReplyChip } from '../_components/AiReplyChip';
import { BoardSettingsButton } from '../_components/BoardSettingsButton';
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
 *   finished game is being reviewed, not played, so no mask or peek.
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
}: {
  displayFen: string | null;
  currentFen: string;
  playerSide: 'white' | 'black';
  effectiveFlipped: boolean;
  preferences: GamePreferences;
  lastMove: ComponentProps<typeof InlineBoardView>['lastMove'];
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
  onIllegalMove: (attempt?: string) => void;
  aiReply: { active: boolean; thinking: boolean };
  aiMoveNotation: string | null;
  isAiThinking: boolean;
  canEditPerGameSettings: boolean;
  onOpenSettings: () => void;
}): { inProgressBoardView: ReactNode; finishedBoardView: ReactNode } {
  // Only surface the on-board AI chip while the board is actually hidden (a
  // blindfold mode AND currently masked). When the board is visible — 'always'
  // mode, or a peeked-open board — the AI's move is right there on the squares,
  // so the "AI played …" / thinking chip would just be redundant clutter over a
  // readable position. Gating on `boardMasked` (not just the mode) also keeps a
  // setting change from popping the chip back over an open peek.
  const showAiReplyChip = preferences.boardVisibility !== 'always' && boardMasked;

  const canBoardMove = !boardMasked && isPlayerTurn && !isLoading && currentPosition === -1;

  const sharedProps = {
    fen: displayFen || currentFen,
    playerSide,
    flipped: effectiveFlipped,
    lastMove: preferences.highlightLastMove && currentPosition === -1 ? lastMove : null,
    preferences,
    movesLength,
    currentPosition,
    formattedPgn,
    onNavigateToStart: navigation.navigateToStart,
    onNavigatePrevious: navigation.navigatePrevious,
    onNavigateNext: navigation.navigateNext,
    onNavigateToEnd: navigation.navigateToEnd,
    onNavigateToPosition: navigation.navigateToPosition,
    onFlipBoard,
  } as const;

  const inProgressBoardView = (
    <InlineBoardView
      {...sharedProps}
      alwaysOpen
      masked={boardMasked}
      maskDismissable={preferences.boardVisibility === 'peek'}
      onReveal={onReveal}
      onMove={canBoardMove ? onBoardMove : undefined}
      onIllegalMove={canBoardMove ? onIllegalMove : undefined}
      // AI reply surfaced on the board itself (visible without scrolling to the
      // page title): "thinking…" while computing, then the move, which fades.
      // While the chip is active it owns the board center; `badgeActive` tells
      // the mask to drop its own label so the two don't stack.
      boardBadge={
        showAiReplyChip ? (
          <AiReplyChip
            active={aiReply.active}
            thinking={aiReply.thinking}
            aiMoveNotation={aiMoveNotation}
          />
        ) : undefined
      }
      badgeActive={showAiReplyChip && aiReply.active}
      // In 'always' mode the board is visible (no mask, no AI-reply chip), so a
      // slow engine looks indistinguishable from a freeze. Surface a "thinking"
      // overlay while the AI computes. In blindfold modes the masked board +
      // AiReplyChip already cover this, so this stays off there.
      aiThinking={preferences.boardVisibility === 'always' && isAiThinking}
      // Per-game settings gear, pinned to the board's top-right (move-list strip
      // end when shown, mask top-right when masked). Hidden for legacy games
      // with no per-game snapshot to edit. Game details stays in the panel.
      topRightControl={
        canEditPerGameSettings ? <BoardSettingsButton onClick={onOpenSettings} /> : undefined
      }
    />
  );

  const finishedBoardView = <InlineBoardView {...sharedProps} alwaysOpen />;

  return { inProgressBoardView, finishedBoardView };
}
