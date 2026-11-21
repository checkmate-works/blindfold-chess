import dynamic from 'next/dynamic';

import { routePlannerChallengeDefinition } from '@blindfold-chess/features/route-planner';

import { CHALLENGE_TIME_LIMIT } from '@/lib/challenge/constants';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const RoutePlannerChallengeSession = dynamic(
  () => import('../_components/RoutePlannerChallengeSession')
);

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/challenge/session',
  sessionLabelKey: 'session',
  robots: { index: false, follow: false },
  showDivider: false,
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'modeTimed', href: '/practice/route-planner/challenge' },
    { labelKey: 'routePlanner.session' },
  ],
  renderContent: ({ locale, searchParams }) => {
    // Resolved through the module's own settings parser, the one the server
    // starts the attempt with, so a link with an unknown piece plays (and is
    // ranked as) the knight on both sides rather than failing to start.
    const { selectedPiece } = routePlannerChallengeDefinition.parseSettings({
      selectedPiece: searchParams.piece,
    }) ?? { selectedPiece: 'knight' as const };

    return (
      <RoutePlannerChallengeSession
        locale={locale}
        initialTimeLimit={CHALLENGE_TIME_LIMIT}
        selectedPiece={selectedPiece}
      />
    );
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
