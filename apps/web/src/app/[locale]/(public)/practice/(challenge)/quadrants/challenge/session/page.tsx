import dynamic from 'next/dynamic';

import type { BoardOrientation } from '@blindfold-chess/features/quadrants';
import { isBoardOrientation } from '@blindfold-chess/types';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const QuadrantsChallenge = dynamic(() => import('../_components/QuadrantsChallenge'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'quadrantAnchors.title', href: '/practice/quadrants' },
    { labelKey: 'modeTimed', href: '/practice/quadrants/challenge' },
    { labelKey: 'quadrantAnchors.session' },
  ],
  renderContent: ({ locale, searchParams }) => {
    const orientationParam = searchParams.orientation;
    const orientation: BoardOrientation = isBoardOrientation(orientationParam)
      ? orientationParam
      : 'white';

    return <QuadrantsChallenge locale={locale} orientation={orientation} />;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
