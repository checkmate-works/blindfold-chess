/**
 * Route Planner Training (ルートプランナートレーニング)
 *
 * @description
 * Untimed training mode for route planning.
 * Problems continue infinitely until the user explicitly ends the session.
 * No timer, no result page - navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite problems -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';

const RoutePlannerSession = dynamic(() =>
  import('../_components/RoutePlannerSession').then((mod) => mod.RoutePlannerSession)
);

const { generateMetadata, Page } = createPracticeTrainingPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/training',
  staticParams: false,
  robots: { index: false, follow: false },
  showDivider: false,
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale, searchParams }) => {
    // Parse allowed pieces
    const piecesParam = searchParams.pieces;
    let allowedPieces: PieceType[] = [];
    if (piecesParam && typeof piecesParam === 'string') {
      const potentialPieces = piecesParam.split('') as PieceType[];
      allowedPieces = potentialPieces.filter((p) => PIECES.includes(p));
    }
    if (allowedPieces.length === 0) {
      allowedPieces = [...PIECES];
    }

    return <RoutePlannerSession locale={locale} allowedPieces={allowedPieces} mode="training" />;
  },
});

export { generateMetadata };
export default Page;
