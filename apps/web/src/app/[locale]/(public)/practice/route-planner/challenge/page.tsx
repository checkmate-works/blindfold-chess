import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { RoutePlannerChallengeSetup } from './_components/RoutePlannerChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/challenge',
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <RoutePlannerChallengeSetup
      locale={locale}
      piece={(searchParams.piece as string) ?? 'knight'}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
