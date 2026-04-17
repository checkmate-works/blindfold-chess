/**
 * Quadrant Anchors Training (象限アンカートレーニング)
 *
 * @description
 * Untimed training mode for quadrant identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page — navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) → Infinite Q&A → End button → Setup + toast
 */
import dynamic from 'next/dynamic';

import type { BoardOrientation } from '@blindfold-chess/features/quadrants';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const QuadrantsTrainingSession = dynamic(() => import('./_components/QuadrantsTrainingSession'));

const { generateMetadata, generateStaticParams, Page } = createPracticeTrainingPage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/training',
  breadcrumbSegments: [
    { labelKey: 'quadrantAnchors.title', href: '/practice/quadrants' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale, searchParams }) => {
    const orientationParam = searchParams.orientation;
    const orientation: BoardOrientation =
      typeof orientationParam === 'string' &&
      ['white', 'black', 'random'].includes(orientationParam)
        ? (orientationParam as BoardOrientation)
        : 'white';

    return <QuadrantsTrainingSession locale={locale} orientation={orientation} />;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
