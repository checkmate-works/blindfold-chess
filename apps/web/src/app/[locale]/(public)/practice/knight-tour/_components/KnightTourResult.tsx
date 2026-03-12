'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaRedo } from 'react-icons/fa';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { KnightTourBoard } from './KnightTourBoard';

type Props = {
  success: boolean;
  moveCount: number;
  visitedSquares: Map<string, number>;
  lastSquare: string;
  startingSquare: string;
  isClosedTour: boolean;
  isTutorial?: boolean;
  onPlayAgain: () => void;
  onChangeSettings?: () => void;
  onFinishTutorial?: () => void;
};

export function KnightTourResult({
  success,
  moveCount,
  visitedSquares,
  lastSquare,
  isClosedTour,
  isTutorial = false,
  onPlayAgain,
  onChangeSettings,
  onFinishTutorial,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');
  const { preferences } = useGamePreferences();

  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        {/* ... (Header and Board sections unchanged) ... */}
        {/* Result Header */}
        <SectionTitle className="text-2xl font-bold text-center mb-6">
          {t('squaresVisited')}: {moveCount} / 64
        </SectionTitle>

        {/* Result Message - only show for success */}
        {success && (
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-foreground mb-2">{t('success')}</p>
            <p className="text-muted-foreground">
              {isClosedTour ? t('closedTourMessage') : t('openTourMessage')}
            </p>
          </div>
        )}

        {/* Final Board */}
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <KnightTourBoard
              currentSquare={lastSquare}
              visitedSquares={visitedSquares}
              availableMoves={[]}
              showCoordinates={preferences.showCoordinates}
              showMoveNumbers={true}
              boardTheme={preferences.boardTheme}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-4">
          {isTutorial ? (
            <>
              <p className="text-muted-foreground whitespace-pre-line">{t('tutorialComplete')}</p>
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
                onClick={onPlayAgain}
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
                  {tPractice('morePractice')}
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
