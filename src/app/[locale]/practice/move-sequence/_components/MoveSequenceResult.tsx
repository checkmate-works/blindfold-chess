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
            {result.results.map((r, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded ${
                  r.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <span className="font-mono text-sm">
                  {index + 1}. {r.expectedMove}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.isCorrect ? (
                    <span className="text-green-600">{t('correct')}</span>
                  ) : (
                    <span className="text-red-600">{t('attempts', { count: r.attempts })}</span>
                  )}
                </span>
              </div>
            ))}
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
