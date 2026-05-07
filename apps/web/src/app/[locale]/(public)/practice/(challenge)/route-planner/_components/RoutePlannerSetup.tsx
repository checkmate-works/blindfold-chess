'use client';

import Link from 'next/link';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeSetupActions } from '../../_components/PracticeSetupActions';
import { PIECE_TYPE_TO_NAME } from '../_lib/utils';
import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerSettings } from './RoutePlannerSettings';

type Props = {
  locale: Locale;
  pieceSelection: RoutePlannerPieceSelection;
  onPieceSelect: (selection: RoutePlannerPieceSelection) => void;
};

export function RoutePlannerSetup({ locale, pieceSelection, onPieceSelect }: Props) {
  const t = useTranslations('practice.routePlanner');

  const pieceName = PIECE_TYPE_TO_NAME[pieceSelection] ?? 'knight';
  const settingsQuery = `piece=${pieceName}`;

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
        <div className="mb-6 text-center" data-tour-id="route-planner-tutorial">
          <Link
            href={`/${locale}/practice/route-planner/tutorial`}
            className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
          >
            {t('tutorial.viewTutorial')}
          </Link>
        </div>

        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <RoutePlannerSettings pieceSelection={pieceSelection} onPieceSelect={onPieceSelect} />

        <PracticeSetupActions
          locale={locale}
          moduleSlug="route-planner"
          settingsQuery={settingsQuery}
          trainingHref={`/${locale}/practice/route-planner/training?${settingsQuery}#route-planner-session`}
          buttonClassName="w-full mt-6"
          challengeTourId="route-planner-challenge"
          trainingTourId="route-planner-training"
        />
      </div>
    </div>
  );
}
