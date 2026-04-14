'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerSetup } from './RoutePlannerSetup';
import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
  pieceSelection: RoutePlannerPieceSelection;
  onPieceSelect: (selection: RoutePlannerPieceSelection) => void;
};

export function RoutePlannerPageContent({ locale, pieceSelection, onPieceSelect }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/route-planner/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return null;
  }

  return (
    <RoutePlannerSetup
      locale={locale}
      pieceSelection={pieceSelection}
      onPieceSelect={onPieceSelect}
    />
  );
}
