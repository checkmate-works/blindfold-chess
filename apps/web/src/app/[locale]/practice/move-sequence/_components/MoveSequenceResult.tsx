'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaCheckCircle, FaRedo, FaTimesCircle } from 'react-icons/fa';

import type { MoveSequenceSessionResult } from '../_lib/types';

type Props = {
  result: MoveSequenceSessionResult;
  onTryAgain: () => void;
  onBackToSetup: () => void;
};

export function MoveSequenceResult({ result, onTryAgain, onBackToSetup }: Props) {
  const t = useTranslations('practice.moveSequence');
  const tPractice = useTranslations('practice');

  const isPerfect = result.accuracy === 100;

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <div
        className={`bg-card rounded-xl shadow-sm border p-6 text-center ${
          isPerfect ? 'border-green-500' : 'border-border'
        }`}
      >
        <div className="flex justify-center mb-4">
          {isPerfect ? (
            <FaCheckCircle className="text-6xl text-green-500" />
          ) : (
            <FaTimesCircle className="text-6xl text-muted-foreground" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isPerfect ? t('perfect') : t('completed')}
        </h2>
        <p className="text-muted-foreground">
          {isPerfect ? t('perfectMessage') : t('completedMessage')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('accuracy')}</p>
          <p className="text-3xl font-bold text-foreground">{result.accuracy}%</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('correctMoves')}</p>
          <p className="text-3xl font-bold text-foreground">
            {result.correctMoves} / {result.totalMoves}
          </p>
        </div>
      </div>

      {/* Move Details */}
      {result.results.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveDetails')}</h3>
          <div className="space-y-2">
            {result.results.map((r, index) => {
              const bgColor = r.isCorrect ? 'bg-green-500/10' : 'bg-yellow-500/10';

              return (
                <div key={index} className={`p-3 rounded ${bgColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">
                      {index + 1}. {r.expectedMove}
                    </span>
                    <span className="text-xs">
                      {r.isCorrect ? (
                        <span className="text-green-600 dark:text-green-400">{t('correct')}</span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          {t('attempts', { count: r.attempts })}
                        </span>
                      )}
                    </span>
                  </div>
                  {r.wrongAttempts && r.wrongAttempts.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="text-red-500 dark:text-red-400">
                        {t('wrongAttempts')}: {r.wrongAttempts.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onTryAgain}
          variant="primary"
          size="lg"
          icon={<FaRedo />}
          className="flex-1"
        >
          {tPractice('tryAgain')}
        </Button>
        <Button onClick={onBackToSetup} variant="secondary" size="lg" className="flex-1">
          {t('backToSetup')}
        </Button>
      </div>
    </div>
  );
}
