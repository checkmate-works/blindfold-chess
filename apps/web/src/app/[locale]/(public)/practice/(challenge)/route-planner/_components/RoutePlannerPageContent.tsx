'use client';

import { TutorialGate } from '@/app/[locale]/(public)/practice/_components/TutorialGate';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerSetup } from './RoutePlannerSetup';

type Props = {
  locale: Locale;
  pieceSelection: RoutePlannerPieceSelection;
  onPieceSelect: (selection: RoutePlannerPieceSelection) => void;
};

export function RoutePlannerPageContent({ locale, pieceSelection, onPieceSelect }: Props) {
  return (
    <TutorialGate locale={locale} moduleId="routePlanner">
      <RoutePlannerSetup
        locale={locale}
        pieceSelection={pieceSelection}
        onPieceSelect={onPieceSelect}
      />
    </TutorialGate>
  );
}
