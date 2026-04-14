import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const SquareColorsChallenge = dynamic(() => import('../_components/SquareColorsChallenge'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'squareColors.title', href: '/practice/square-colors' },
    { labelKey: 'modeTimed', href: '/practice/square-colors/challenge' },
    { labelKey: 'squareColors.session' },
  ],
  renderContent: ({ locale }) => <SquareColorsChallenge locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
