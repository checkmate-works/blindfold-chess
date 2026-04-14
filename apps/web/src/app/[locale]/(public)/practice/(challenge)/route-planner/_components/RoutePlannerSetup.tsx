'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PIECE_TYPE_TO_NAME } from '../_lib/utils';
import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerSettings } from './RoutePlannerSettings';
import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
  pieceSelection: RoutePlannerPieceSelection;
  onPieceSelect: (selection: RoutePlannerPieceSelection) => void;
};

export function RoutePlannerSetup({ locale, pieceSelection, onPieceSelect }: Props) {
  const t = useTranslations('practice.routePlanner');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleViewTutorial = () => {
    localStorage.removeItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY);
    router.push(`/${locale}/practice/route-planner/tutorial`);
  };

  const pieceName = PIECE_TYPE_TO_NAME[pieceSelection] ?? 'knight';

  return (
    <div>
      <div className="mb-8">
        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
        <div className="mb-2 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="flex items-center justify-center gap-3 text-foreground">
            <ChessPiece type="n" color="w" size={36} />
            <span className="text-lg font-bold">e2</span>
            <FaArrowRight className="text-muted-foreground" />
            <span className="text-lg font-bold">g3</span>
          </div>
        </div>
        <div className="mb-6 text-center">
          <button
            onClick={handleViewTutorial}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('tutorial.viewTutorial')}
          </button>
        </div>

        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <RoutePlannerSettings pieceSelection={pieceSelection} onPieceSelect={onPieceSelect} />

        <Link href={`/${locale}/practice/route-planner/challenge/session?piece=${pieceName}`}>
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full mt-6">
            {tp('startChallenge')}
          </Button>
        </Link>
        <div className="mt-4 text-center">
          <Link
            href={`/${locale}/practice/route-planner/training?piece=${pieceName}#route-planner-session`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tp('switchToTraining')}
          </Link>
        </div>
      </div>
    </div>
  );
}
