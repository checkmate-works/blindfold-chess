'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';
import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';

type Props = {
  problem: BoardSymmetryProblem;
  /**
   * Rendered between the question sentence and the answer slot. Challenge
   * mode puts its timer-and-lives header here; training passes nothing.
   */
  statusHeader?: ReactNode;
  selectedFile: string | null;
  selectedRank: string | null;
  /** null until the answer is graded, then true / false. Tints the answer slot. */
  isCorrect: boolean | null;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  onBackspace: () => void;
  /**
   * Stops accepting input: unbinds the physical keyboard and greys out the
   * hint. Challenge mode also counts the countdown and the pause overlay as
   * locking; training only has the between-questions grading pause.
   */
  inputLocked: boolean;
  /**
   * Dims the on-screen coordinate pad and swallows its taps. Deliberately a
   * separate flag from `inputLocked`: during the challenge countdown the pad
   * is already hidden behind the countdown overlay, so it is left undimmed to
   * avoid stacking two treatments on the same pixels.
   */
  inputDimmed: boolean;
};

/**
 * The board-symmetry prompt, its answer slot, and the coordinate pad.
 *
 * @description
 * Everything challenge and training modes render identically between the
 * chrome: the question sentence, the `square → answer` line with its
 * correctness tint, the coordinate pad, and the physical-keyboard binding
 * that mirrors the pad. Keeping the binding next to the pad it drives is the
 * point — the two had been declared separately in both files.
 */
export function BoardSymmetryQuestionPanel({
  problem,
  statusHeader,
  selectedFile,
  selectedRank,
  isCorrect,
  onFileToggle,
  onRankToggle,
  onBackspace,
  inputLocked,
  inputDimmed,
}: Props) {
  const t = useTranslations('practice.boardSymmetry');

  useAlgebraicKeyboardInput({
    onFile: onFileToggle,
    onRank: onRankToggle,
    onBackspace,
    enabled: !inputLocked,
  });

  const feedbackColor =
    isCorrect === true
      ? 'text-success'
      : isCorrect === false
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <>
      <SectionTitle className="mb-4">
        {t('question', {
          type: t(`types.${problem.type}`),
          square: problem.square,
        })}
      </SectionTitle>

      {statusHeader}

      <div className="mb-6">
        <div className="flex items-center justify-center gap-4 text-6xl font-bold text-foreground mb-4 font-mono select-none">
          {problem.square}
          <span className="text-muted-foreground">→</span>
          <span className={`min-w-[2ch] ${feedbackColor}`}>
            {selectedFile && selectedRank ? `${selectedFile}${selectedRank}` : '?'}
          </span>
        </div>
      </div>

      {/* No negative inset: both callers lay this panel out edge-to-edge, so the
          pad already spans the full column. The `-mx-8 sm:mx-0` that used to be
          here existed only to cancel a `p-8` container both of them have since
          dropped, and would now bleed the pad past the column on mobile. */}
      <div className="space-y-4">
        <CoordinateInput
          selectedFiles={selectedFile ? new Set([selectedFile]) : new Set()}
          selectedRanks={selectedRank ? new Set([selectedRank]) : new Set()}
          onFileToggle={onFileToggle}
          onRankToggle={onRankToggle}
          className={`max-w-md mx-auto ${inputDimmed ? 'pointer-events-none opacity-50' : ''}`}
        />
        <AlgebraicKeyboardHint disabled={inputLocked} />
      </div>
    </>
  );
}
