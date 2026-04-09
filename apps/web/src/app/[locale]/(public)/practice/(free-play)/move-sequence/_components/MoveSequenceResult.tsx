'use client';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRedo } from 'react-icons/fa';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { SectionTitle } from '@/app/[locale]/_components';

import type { MoveSequenceSessionResult } from '../_lib/types';

type Props = {
  result: MoveSequenceSessionResult;
  isTutorial?: boolean;
  onTryAgain: () => void;
  onChangeSettings?: () => void;
  onFinishTutorial?: () => void;
};

export function MoveSequenceResult({
  result,
  isTutorial = false,
  onTryAgain,
  onChangeSettings,
  onFinishTutorial,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('practice.moveSequence');
  const tPractice = useTranslations('practice');

  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        {/* Result Header */}
        <SectionTitle className="text-2xl font-bold text-center mb-6">
          {t('accuracy')}: {result.accuracy}% ({result.correctMoves}/{result.totalMoves})
        </SectionTitle>

        {/* Move Details */}
        {result.results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveDetails')}</h3>
            <div className="space-y-2">
              {result.results.map((r, index) => {
                const bgColor = r.isCorrect ? 'bg-success/10' : 'bg-warning/10';

                return (
                  <div key={index} className={`p-3 rounded ${bgColor}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">
                        {index + 1}. {r.expectedMove}
                      </span>
                      <span className="text-xs">
                        {r.isCorrect ? (
                          <span className="text-success">{t('correct')}</span>
                        ) : (
                          <span className="text-warning">
                            {t('attempts', { count: r.attempts })}
                          </span>
                        )}
                      </span>
                    </div>
                    {r.wrongAttempts && r.wrongAttempts.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="text-destructive">
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
        <div className="mt-6 space-y-4">
          {isTutorial ? (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {t('tutorialComplete')}
              </p>
              <Button
                onClick={onFinishTutorial}
                variant="primary"
                size="lg"
                fullWidth
                className="rounded-lg"
              >
                {t('finishTutorial')}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onTryAgain}
                variant="primary"
                size="lg"
                fullWidth
                icon={<FaRedo />}
                className="rounded-lg"
              >
                {tPractice('tryAgain')}
              </Button>

              {onChangeSettings && (
                <Button
                  onClick={onChangeSettings}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="rounded-lg"
                >
                  {tPractice('changeSettings')}
                </Button>
              )}

              <div className="text-center pt-2">
                <Link
                  href="/practice"
                  locale={locale}
                  className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  {tPractice('doOtherPractice')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </PracticeLayout>
  );
}
