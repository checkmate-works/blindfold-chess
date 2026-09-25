import dynamic from 'next/dynamic';

import { parsePieceParam } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/query-params';
import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const LegalMovesSession = dynamic(() => import('../_components/LegalMovesSession'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'legalMoves.title', href: '/practice/legal-moves' },
    { labelKey: 'modeTimed', href: '/practice/legal-moves/challenge' },
    { labelKey: 'legalMoves.session' },
  ],
  renderContent: ({ locale, searchParams }) => {
    const { selectedPiece, selectedPieces } = parsePieceParam(
      searchParams.piece as string | undefined
    );

    return (
      <LegalMovesSession
        locale={locale}
        selectedPieces={selectedPieces}
        selectedPiece={selectedPiece}
      />
    );
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
