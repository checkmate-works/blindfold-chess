'use client';

import { useTranslations } from 'next-intl';

import { Button, ChessBoard, FlipBoardButton } from '@/app/_components';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { MAX_SOLUTION_MOVES } from '../_hooks/use-puzzle-solution-moves';
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
 * The board shows the position after already-entered moves
 * (`solution.currentFen`) and is drag-enabled (`movablePieces="side-to-move"`
 * since a solution line alternates sides across moves) as an alternative to
 * typing into `MoveInputPanel` below it — both funnel into the same
 * `solution.handleMoveSubmit`, which independently re-validates whatever SAN
 * it receives, so there's no special-casing needed between the two input
 * paths. Visibility is forced fully-visible (not the author's own blindfold
 * practice prefs) since this is an authoring screen, not a practice session.
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

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm text-muted-foreground">
          <span aria-hidden className="mr-1">
            {solution.currentTurn === 'w' ? '⚪' : '⚫'}
          </span>
          {solution.currentTurn === 'w' ? t('whiteToMove') : t('blackToMove')}
        </p>
        <FlipBoardButton onClick={onFlip} title={t('flipBoard')} />
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <ChessBoard
            fen={solution.currentFen}
            flipped={flipped}
            showCoordinates={true}
            boardTheme={preferences.boardTheme}
            showOwnPieces={true}
            showOpponentPieces={true}
            pieceShapeMode="normal"
            pieceColors="normal"
            pawnHideMode="none"
            movablePieces="side-to-move"
            onMove={
              pending || reachedMaxMoves
                ? undefined
                : (san) => {
                    solution.handleMoveSubmit(san as AlgebraicNotation);
                  }
            }
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          {backLabel}
        </button>
      </div>

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

        {reachedMaxMoves ? (
          <p className="text-sm text-muted-foreground">{t('maxMovesReached')}</p>
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
    </>
  );
}
