/**
 * Quadrant Anchors Training (象限アンカートレーニング)
 *
 * @description
 * Untimed training mode for quadrant identification.
 * Problems continue infinitely until the user explicitly ends the session.
 * No timer, no result page - navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite problems -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const QuadrantPlaying = dynamic(() => import('../_components/QuadrantPlaying'));

const { generateMetadata, Page } = createPracticeTrainingPage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/training',
  staticParams: false,
  robots: { index: false, follow: false },
  breadcrumbSegments: [
    { labelKey: 'quadrantAnchors.title', href: '/practice/quadrants' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ searchParams }) => {
    const orientationParam = searchParams.orientation;
    const initialOrientation =
      (typeof orientationParam === 'string' ? (orientationParam as 'white' | 'black' | 'random') : undefined) ||
      'white';

    return (
      <div className="max-w-3xl mx-auto">
        <QuadrantPlaying
          key={initialOrientation}
          initialProblemCount={0}
          initialOrientation={initialOrientation}
          mode="training"
        />
      </div>
    );
  },
});

export { generateMetadata };
export default Page;
