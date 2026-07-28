'use client';

import { useTranslations } from 'next-intl';

import { BoardFrame, Button, ChessBoard, FlipBoardButton } from '@/app/_components';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { MAX_SOLUTION_MOVES } from '../_hooks/use-puzzle-solution-moves';
import { SideToMoveIndicator } from './SideToMoveIndicator';
import { SolutionMoveList } from './SolutionMoveList';

type Props = {
  flipped: boolean;
  onFlip: () => void;
  solution: ReturnType<typeof usePuzzleSolutionMoves>;
  pending: boolean;
  onBack: () => void;
  backLabel: string;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  primaryActionLoading?: boolean;
};

/**
 * The shared field body of the solution step — board, solution move list,
 * and move input — used by both the create and edit flows' solution-step
 * wrapper components.
 *
 * The board shows the currently viewed ply of the entered line
 * (`solution.viewedFen`) and, like the game screen, carries a clickable move
 * strip above it and first/prev/next/last controls below it for stepping
 * through the line. At the tip it is drag-enabled
 * (`movablePieces="side-to-move"` since a solution line alternates sides
 * across moves) as an alternative to typing into `MoveInputPanel` below it —
 * both funnel into the same `solution.handleMoveSubmit`, which independently
 * re-validates whatever SAN it receives, so there's no special-casing needed
 * between the two input paths. While an earlier ply is browsed, all move
 * entry is locked (a dragged move would otherwise read as "branch from
 * here", which this line-shaped editor doesn't support). Visibility is
 * forced fully-visible (not the author's own blindfold practice prefs)
 * since this is an authoring screen, not a practice session.
 *
 * The board can never invalidate already-entered moves here (dragging only
 * appends a new move, exactly like typing one), so `onBack` is a plain
 * navigation with no confirmation needed.
 */
export function PuzzleSolutionFields({
  flipped,
  onFlip,
  solution,
  pending,
  onBack,
  backLabel,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled,
  primaryActionLoading = false,
}: Props) {
  const t = useTranslations('practice.puzzle.create');
  const tPlay = useTranslations('play');
  const { preferences, updatePreferences } = useGamePreferences();

  const reachedMaxMoves = solution.moves.length >= MAX_SOLUTION_MOVES;
  // Checkmate ends the line — no further reply exists, so no further move
  // can be added. Removing the mating move (Undo, via SolutionMoveList's
  // "remove last") recomputes solution.currentFen away from checkmate and
  // this flips back automatically.
  const inputLocked = reachedMaxMoves || solution.isCheckmate;
  const display = useBoardDisplay(solution.viewedLastMove);

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm text-muted-foreground">
          <SideToMoveIndicator turn={solution.currentTurn} />
        </p>
        <FlipBoardButton onClick={onFlip} title={t('flipBoard')} />
      </div>
      <BoardFrame>
        <HorizontalMoveList
          formattedPgn={solution.formattedPgn}
          currentPosition={solution.viewedPly - 1}
          onNavigateToPosition={(position) => solution.goToPly(position + 1)}
        />
        <ChessBoard
          fen={solution.viewedFen}
          flipped={flipped}
          {...display}
          showOwnPieces={true}
          showOpponentPieces={true}
          pieceShapeMode="normal"
          pieceColors="normal"
          pawnHideMode="none"
          movablePieces="side-to-move"
          onMove={
            pending || inputLocked || solution.isViewingHistory
              ? undefined
              : (san) => {
                  solution.handleMoveSubmit(san as AlgebraicNotation);
                }
          }
        />
        {solution.moves.length > 0 && (
          <MoveNavigationRow
            onNavigateToStart={() => solution.goToPly(0)}
            onNavigatePrevious={() => solution.goToPly(solution.viewedPly - 1)}
            onNavigateNext={() => solution.goToPly(solution.viewedPly + 1)}
            onNavigateToEnd={() => solution.goToPly(solution.moves.length)}
            isPreviousDisabled={solution.viewedPly === 0}
            isNextDisabled={!solution.isViewingHistory}
          />
        )}
      </BoardFrame>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium">
            {t('solutionSection')} <span className="text-destructive">*</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {solution.moves.length} / {MAX_SOLUTION_MOVES}
          </span>
        </div>

        {solution.moves.length > 0 && (
          <SolutionMoveList
            moves={solution.moves}
            firstTurn={solution.firstTurn}
            onRemoveLast={solution.handleRemoveLast}
            removeAriaLabel={t('removeLastMove', {
              move: solution.moves[solution.moves.length - 1]!,
            })}
            disabled={pending}
            renderAfter={(index) => (
              <input
                type="text"
                value={solution.notes[index] ?? ''}
                onChange={(e) => solution.handleNoteChange(index, e.target.value)}
                maxLength={PUZZLE_NOTE_MAX_LENGTH}
                placeholder={t('addMoveNote')}
                aria-label={t('noteAriaLabel', { move: solution.moves[index]! })}
                className="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
              />
            )}
          />
        )}

        {solution.isViewingHistory ? (
          // Move entry always appends to the line's tip, so while an earlier
          // ply is on the board the input is hidden — a submitted move would
          // otherwise apply to a position the author isn't looking at.
          <p className="text-sm text-muted-foreground">{t('viewingHistory')}</p>
        ) : inputLocked ? (
          <p className="text-sm text-muted-foreground">
            {solution.isCheckmate ? t('checkmateReached') : t('maxMovesReached')}
          </p>
        ) : (
          <MoveInputPanel
            preferences={preferences}
            updatePreferences={updatePreferences}
            currentFen={solution.currentFen}
            moveInput={solution.moveInput}
            onMoveInputChange={solution.setMoveInput}
            error={solution.moveError}
            onErrorClear={() => solution.setMoveError(null)}
            onSubmit={solution.handleMoveSubmit}
            disabled={pending}
            inputPlaceholder={t('movePlaceholder')}
            selectPlaceholder={tPlay('selectMove')}
            toggleTitle={tPlay('switchInputMode')}
            playerColor={solution.currentTurn}
            showLegalMovesHint={false}
          />
        )}

        {solution.solutionError && (
          <p className="text-sm text-destructive">{solution.solutionError}</p>
        )}
      </div>

      {/* Same forward-primary / back-secondary stack as the preview step, so
          every wizard step exposes its prev/next transitions the same way. */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending || primaryActionDisabled}
          loading={primaryActionLoading}
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          disabled={pending}
          onClick={onBack}
        >
          {backLabel}
        </Button>
      </div>
    </>
  );
}
