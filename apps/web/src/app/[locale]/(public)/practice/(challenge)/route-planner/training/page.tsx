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

import { parsePieceParam } from '../_lib/query-params';

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
    const allowedPieces = parsePieceParam(searchParams.piece as string | undefined);

    return <RoutePlannerSession locale={locale} allowedPieces={allowedPieces} mode="training" />;
  },
});

export { generateMetadata };
export default Page;
