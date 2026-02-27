'use client';

import { useTranslations } from 'next-intl';

import { FaCheck } from 'react-icons/fa';

import { getEvaluationIcon } from '@/lib/evaluation';

import type { MoveLogEntry } from '../_lib';

type Props = {
  entry: MoveLogEntry;
  interactive?: boolean;
  onClick?: () => void;
};

export function MoveLogEntryItem({ entry, interactive = false, onClick }: Props) {
  const t = useTranslations('postmortem');

  const moveNotation = entry.isWhiteMove
    ? `${entry.moveNumber}. ${entry.move}`
    : `${entry.moveNumber}... ${entry.move}`;

  const interactiveClasses = interactive ? 'cursor-pointer hover:bg-muted/50 rounded p-1 -m-1' : '';

  if (entry.status === 'correct') {
    return (
      <div className={`mb-2 ${interactiveClasses}`} onClick={onClick}>
        <div className="text-success">
          {moveNotation} <FaCheck className="inline w-3 h-3" />
        </div>
        {entry.evaluation && (
          <div className="text-muted-foreground text-xs ml-4 mt-1">
            <div className="flex items-center gap-1">
              {getEvaluationIcon(entry.evaluation.loss, entry.evaluation.mate !== undefined)}
              <span>
                {entry.evaluation.text} (
                {entry.evaluation.mate
                  ? `#${entry.evaluation.mate}`
                  : (entry.evaluation.score / 100).toFixed(2)}
                )
              </span>
            </div>
            {entry.evaluation.bestMove && (
              <div className="ml-5 mt-0.5 text-muted-foreground/80">
                {t('bestMove')}: {entry.evaluation.bestMove}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (entry.status === 'incorrect') {
    return (
      <div className={`text-destructive mb-2 ${interactiveClasses}`} onClick={onClick}>
        {entry.incorrectMove
          ? `${entry.isWhiteMove ? `${entry.moveNumber}. ` : `${entry.moveNumber}... `}${entry.incorrectMove} ${t('logIncorrect')}`
          : `${moveNotation} ${t('logIncorrect')}`}
      </div>
    );
  }

  // auto
  return (
    <div className={`mb-2 ${interactiveClasses}`} onClick={onClick}>
      <div className="text-muted-foreground">{moveNotation}</div>
      {entry.evaluation && (
        <div className="text-muted-foreground text-xs ml-4 mt-1">
          <div className="flex items-center gap-1">
            {getEvaluationIcon(entry.evaluation.loss, entry.evaluation.mate !== undefined)}
            <span>
              {entry.evaluation.text} (
              {entry.evaluation.mate
                ? `#${entry.evaluation.mate}`
                : (entry.evaluation.score / 100).toFixed(2)}
              )
            </span>
          </div>
          {entry.evaluation.bestMove && (
            <div className="ml-5 mt-0.5 text-muted-foreground/80">
              {t('bestMove')}: {entry.evaluation.bestMove}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
