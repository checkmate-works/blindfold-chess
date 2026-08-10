'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ArrowKeyAnswer } from '@/app/[locale]/(public)/practice/_components/ArrowKeyAnswer';

import { pieceDisplayMap } from '../_data/constants';
import type { MoveQuestion } from '../_lib/types';

type Props = {
  currentQuestion: MoveQuestion;
  /** The previous answer, colouring the prompt; null before the first one. */
  lastAnswer: { correct: boolean } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
  /**
   * Blocks both the buttons and the arrow-key bindings. Challenge mode also
   * counts the countdown and the pause overlay as disabling; training only
   * has the between-questions pause.
   */
  disabled: boolean;
};

/**
 * The legal-moves prompt and its legal / illegal answer pair.
 *
 * @description
 * Everything challenge and training modes render identically: the question
 * sentence tinted by the last answer, the piece glyph, and the two buttons
 * mirrored onto ← / →. What differs between the modes — the timer and lives
 * header, the pause and countdown overlays, the quit control, the training
 * CTA — stays in the two callers, which is why this takes no mode flag.
 */
export function LegalMovesQuestionPanel({
  currentQuestion,
  lastAnswer,
  onAnswer,
  getQuestion,
  disabled,
}: Props) {
  const t = useTranslations('practice.legalMoves');

  return (
    <>
      <div className="mb-8 min-h-[160px] flex flex-col items-center justify-center">
        <div
          className={`text-lg font-bold mb-6 transition-colors duration-200 ${
            lastAnswer
              ? lastAnswer.correct
                ? 'text-success'
                : 'text-destructive'
              : 'text-foreground'
          }`}
        >
          {getQuestion(currentQuestion.from, currentQuestion.to)
            .replace('{from}', currentQuestion.from)
            .replace('{to}', currentQuestion.to)}
        </div>
        <div className="text-7xl select-none">{pieceDisplayMap[currentQuestion.piece]}</div>
      </div>

      <ArrowKeyAnswer
        disabled={disabled}
        bindings={{
          ArrowLeft: { label: t('legal'), onTrigger: () => onAnswer(true) },
          ArrowRight: { label: t('illegal'), onTrigger: () => onAnswer(false) },
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onAnswer(true)}
            disabled={disabled}
            className="px-6 py-4 bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed text-success border border-success/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
          >
            <span className="text-2xl">○</span>
            <span>{t('legal')}</span>
          </button>
          <button
            onClick={() => onAnswer(false)}
            disabled={disabled}
            className="px-6 py-4 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive border border-destructive/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
          >
            <span className="text-2xl">×</span>
            <span>{t('illegal')}</span>
          </button>
        </div>
      </ArrowKeyAnswer>
    </>
  );
}
