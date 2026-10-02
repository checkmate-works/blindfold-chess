import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { parsePieceSelectionSeed } from '../_lib/query-params';
import { RoutePlannerChallengeSetup } from './_components/RoutePlannerChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/challenge',
  practiceId: 'route-planner',
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <RoutePlannerChallengeSetup
      locale={locale}
      initialPieceSelection={parsePieceSelectionSeed(searchParams.piece)}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
