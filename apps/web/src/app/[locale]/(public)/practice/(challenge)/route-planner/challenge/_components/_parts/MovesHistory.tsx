'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaUndo } from 'react-icons/fa';

type Props = {
  start: string;
  end: string;
  moves: string[];
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  onUndo: () => void;
};

export function MovesHistory({
  start,
  end,
  moves,
  showFeedback,
  lastAnswerCorrect,
  onUndo,
}: Props) {
  const tPractice = useTranslations('practice');

  return (
    <div
      className={`flex flex-wrap gap-2 items-center min-h-[3rem] p-4 rounded-md border transition-colors duration-300 ${
        showFeedback && lastAnswerCorrect !== null
          ? lastAnswerCorrect
            ? 'border-success bg-success/10'
            : 'border-destructive bg-destructive/10'
          : 'border-transparent bg-muted/50'
      }`}
    >
      <span className="font-mono font-bold text-muted-foreground">{start}</span>
      {moves.map((move, i) => {
        const isFinalTarget = showFeedback && i === moves.length - 1 && move === end;
        return (
          <div key={i} className="flex items-center">
            <span className="text-muted-foreground mx-1">&rarr;</span>
            <span
              className={
                isFinalTarget
                  ? 'font-mono font-bold text-muted-foreground'
                  : 'font-mono font-bold bg-background px-2 py-1 rounded border border-border'
              }
            >
              {move}
            </span>
          </div>
        );
      })}

      {moves.length > 0 && !showFeedback && (
        <button
          onClick={onUndo}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
          title={tPractice('undo')}
        >
          <FaUndo size={12} />
        </button>
      )}

      {!showFeedback && (
        <div className="flex items-center ml-2">
          <span className="text-muted-foreground mx-1">&rarr;</span>
          <span className="font-mono font-bold text-muted-foreground">{end}</span>
        </div>
      )}
    </div>
  );
}
