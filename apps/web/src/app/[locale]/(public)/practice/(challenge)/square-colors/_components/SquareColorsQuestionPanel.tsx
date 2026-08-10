'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardTheme } from '@/lib/games/board-themes';

import { ArrowKeyAnswer } from '@/app/[locale]/(public)/practice/_components/ArrowKeyAnswer';

import { SquareColorAnswerButtons } from './SquareColorAnswerButtons';
import { SquareColorQuestionDisplay } from './SquareColorQuestionDisplay';

type Props = {
  currentSquare: string;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (answer: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
  /**
   * Blocks both the buttons and the arrow-key bindings. Challenge mode also
   * counts the countdown and the pause overlay as disabling; training only
   * has the between-questions pause.
   */
  disabled: boolean;
};

/**
 * The square-colour prompt and its light / dark answer pair.
 *
 * @description
 * The display and the buttons were already shared components; what was not
 * was the wiring between them — which square feeds the prompt, which labels
 * go on the buttons, and the ← / → mirror of those same two answers. Holding
 * all three together means the keyboard shortcut cannot drift away from the
 * button it stands in for.
 */
export function SquareColorsQuestionPanel({
  currentSquare,
  lastAnswer,
  onAnswer,
  boardTheme,
  disabled,
}: Props) {
  const t = useTranslations('practice.squareColors');

  return (
    <>
      <SquareColorQuestionDisplay currentSquare={currentSquare} lastAnswer={lastAnswer} />

      <ArrowKeyAnswer
        disabled={disabled}
        bindings={{
          ArrowLeft: { label: t('white'), onTrigger: () => onAnswer('light') },
          ArrowRight: { label: t('black'), onTrigger: () => onAnswer('dark') },
        }}
      >
        <SquareColorAnswerButtons
          onAnswer={onAnswer}
          disabled={disabled}
          labels={{ white: t('white'), black: t('black') }}
          boardTheme={boardTheme}
        />
      </ArrowKeyAnswer>
    </>
  );
}
