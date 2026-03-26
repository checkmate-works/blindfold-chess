import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const QuadrantPlaying = dynamic(() => import('../_components/QuadrantPlaying'));

const { generateMetadata, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/challenge',
  sessionLabelKey: 'session',
  staticParams: false,
  robots: { index: false, follow: false },
  breadcrumbSegments: [
    { labelKey: 'quadrantAnchors.title', href: '/practice/quadrants' },
    { labelKey: 'quadrantAnchors.session' },
  ],
  renderContent: ({ searchParams }) => {
    const countParam = searchParams.count;
    const problemCount = countParam && typeof countParam === 'string' ? parseInt(countParam, 10) : 10;
    const orientationParam = searchParams.orientation;
    const initialOrientation =
      (typeof orientationParam === 'string' ? (orientationParam as 'white' | 'black' | 'random') : undefined) ||
      'white';

    return (
      <div className="max-w-3xl mx-auto">
        <QuadrantPlaying
          key={initialOrientation}
          initialProblemCount={problemCount}
          initialOrientation={initialOrientation}
        />
      </div>
    );
  },
});

export { generateMetadata };
export default Page;
