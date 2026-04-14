import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { BoardSymmetryChallengeSetup } from './_components/BoardSymmetryChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry/challenge',
  breadcrumbSegments: [
    { labelKey: 'boardSymmetry.title', href: '/practice/board-symmetry' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale }) => <BoardSymmetryChallengeSetup locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
