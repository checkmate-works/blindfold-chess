'use client';

import { BoardSkeleton, Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRedo } from 'react-icons/fa';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

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
  const { preferences, isLoaded } = useGamePreferences();

  return (
    <PracticeLayout>
      <div className="mb-8">
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
            {!isLoaded ? (
              <BoardSkeleton />
            ) : (
              <KnightTourBoard
                currentSquare={lastSquare}
                visitedSquares={visitedSquares}
                availableMoves={[]}
                showCoordinates={preferences.showCoordinates}
                showMoveNumbers={true}
                boardTheme={preferences.boardTheme}
              />
            )}
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
              {/* Sign-up nudge for anonymous players who finished a real tour
                  (renders nothing when signed in). Placed directly above the
                  retry / more-practice buttons so the prompt to create an
                  account lands before those buttons can carry the guest away. */}
              <SignUpBanner locale={locale} />

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
                  className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
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
