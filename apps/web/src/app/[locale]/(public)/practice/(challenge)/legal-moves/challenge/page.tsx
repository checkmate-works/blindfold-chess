import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { LegalMovesChallengeSetup } from './_components/LegalMovesChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/challenge',
  breadcrumbSegments: [
    { labelKey: 'legalMoves.title', href: '/practice/legal-moves' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <LegalMovesChallengeSetup locale={locale} piece={(searchParams.piece as string) ?? 'random'} />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
