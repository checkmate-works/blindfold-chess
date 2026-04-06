import dynamic from 'next/dynamic';

import type { BoardOrientation } from '@blindfold-chess/features/quadrants';

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
    const orientation: BoardOrientation =
      typeof orientationParam === 'string' &&
      ['white', 'black', 'random'].includes(orientationParam)
        ? (orientationParam as BoardOrientation)
        : 'white';

    return <QuadrantsChallenge locale={locale} orientation={orientation} />;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
