/**
 * Route Planner Training
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

import { PIECE_NAME_TO_TYPE, VALID_PIECE_NAMES } from '../_lib/utils';
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
    const piece = searchParams.piece as string | undefined;
    const validPieceName =
      piece && (VALID_PIECE_NAMES as readonly string[]).includes(piece) ? piece : 'knight';
    const allowedPieces: PieceType[] = [PIECE_NAME_TO_TYPE[validPieceName]];

    return <RoutePlannerSession locale={locale} allowedPieces={allowedPieces} mode="training" />;
  },
});

export { generateMetadata };
export default Page;
