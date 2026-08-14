'use client';

import type { ActiveField } from '@blindfold-chess/features/diagonal-quiz';

import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';

import { ChessCoordinateKeypad } from './ChessCoordinateKeypad';
import { DiagonalInputField } from './DiagonalInputField';

/**
 * Everything the answer panel needs from whichever input hook drives it.
 * Passed as one object because both call sites already hold it as one — the
 * challenge screen's `useKeypadInput` returns it whole, and the training
 * screen composes it from `useDiagonalInput` plus its own field-click handler.
 */
export type DiagonalInputState = {
  singleDiagonal: boolean;
  singleAntiDiagonal: boolean;
  diagonalStartText: string;
  diagonalEndText: string;
  antiDiagonalStartText: string;
  antiDiagonalEndText: string;
  activeField: ActiveField;
  isDiagonalComplete: boolean;
  isAntiDiagonalComplete: boolean;
  expectingFile: boolean;
  expectingRank: boolean;
  isInputtingStart: boolean;
  isInputtingEnd: boolean;
  handleFilePress: (file: string) => void;
  handleRankPress: (rank: string) => void;
  handleBackspace: () => void;
  handleClear: () => void;
  handleFieldClick: (field: ActiveField) => void;
};

type Props = {
  /** The square being asked about, shown large above the fields. */
  currentSquare: string;
  input: DiagonalInputState;
  isDisabled: boolean;
  /**
   * Announced to screen readers when a result is showing — the caller builds
   * it because "correct" and the spelled-out answer come from different
   * namespaces.
   */
  srResultText: string | null;
  labels: {
    diagonal: string;
    antiDiagonal: string;
    selectFile: string;
    selectRank: string;
  };
  /**
   * Outcome tint per field. Two props, not one: the challenge grades each
   * diagonal independently, so a half-right answer shows one green field and
   * one red. The training screen passes the same value twice.
   */
  diagonalResult: 'correct' | 'incorrect' | null;
  antiDiagonalResult: 'correct' | 'incorrect' | null;
};

/**
 * The diagonal-quiz answer surface: the prompt square, the two coordinate
 * fields, the step hint, and the keypad.
 *
 * The challenge and training screens rendered this identically — right down to
 * the reserved-height step indicator that keeps the keypad from jumping when
 * the hint clears, which is the kind of detail that gets fixed on one screen
 * and not the other.
 */
export function DiagonalAnswerPanel({
  currentSquare,
  input,
  isDisabled,
  srResultText,
  labels,
  diagonalResult,
  antiDiagonalResult,
}: Props) {
  return (
    <>
      <div className="mb-6">
        <div className="text-6xl font-bold text-foreground mb-4 select-none">{currentSquare}</div>

        {srResultText && (
          <p className="sr-only" role="status">
            {srResultText}
          </p>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <DiagonalInputField
          label={labels.diagonal}
          isSingleSquare={input.singleDiagonal}
          activeField={input.activeField}
          fieldType="diagonal"
          startText={input.diagonalStartText}
          endText={input.diagonalEndText}
          isComplete={input.isDiagonalComplete}
          isDisabled={isDisabled}
          isInputtingStart={input.isInputtingStart}
          isInputtingEnd={input.isInputtingEnd}
          onFieldClick={input.handleFieldClick}
          result={diagonalResult}
        />

        <DiagonalInputField
          label={labels.antiDiagonal}
          isSingleSquare={input.singleAntiDiagonal}
          activeField={input.activeField}
          fieldType="antiDiagonal"
          startText={input.antiDiagonalStartText}
          endText={input.antiDiagonalEndText}
          isComplete={input.isAntiDiagonalComplete}
          isDisabled={isDisabled}
          isInputtingStart={input.isInputtingStart}
          isInputtingEnd={input.isInputtingEnd}
          onFieldClick={input.handleFieldClick}
          result={antiDiagonalResult}
        />
      </div>

      {/* Height reserved so the keypad stays put when the hint clears on
          result — no layout shift. */}
      <div className="text-sm text-muted-foreground mb-4 min-h-5">
        {!isDisabled &&
          (input.expectingFile ? labels.selectFile : input.expectingRank ? labels.selectRank : '')}
      </div>

      <ChessCoordinateKeypad
        expectingFile={input.expectingFile}
        expectingRank={input.expectingRank}
        isDisabled={isDisabled}
        onFilePress={input.handleFilePress}
        onRankPress={input.handleRankPress}
        onBackspace={input.handleBackspace}
        onClear={input.handleClear}
      />

      <AlgebraicKeyboardHint disabled={isDisabled} />
    </>
  );
}
