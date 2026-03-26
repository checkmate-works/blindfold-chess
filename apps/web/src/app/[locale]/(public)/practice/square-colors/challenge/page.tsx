import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { SquareColorsChallengeSetup } from './_components/SquareColorsChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors/challenge',
  breadcrumbSegments: [
    { labelKey: 'squareColors.title', href: '/practice/square-colors' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale }) => <SquareColorsChallengeSetup locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
