import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { parsePieceSelectionSeed } from '../_lib/query-params';
import { LegalMovesChallengeSetup } from './_components/LegalMovesChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/challenge',
  practiceId: 'legal-moves',
  breadcrumbSegments: [
    { labelKey: 'legalMoves.title', href: '/practice/legal-moves' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <LegalMovesChallengeSetup
      locale={locale}
      initialPieceSelection={parsePieceSelectionSeed(searchParams.piece)}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
