import dynamic from 'next/dynamic';

import { legalMovesChallengeDefinition } from '@blindfold-chess/features/legal-moves';

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
    // Resolved through the module's own settings parser, the one the server
    // starts the attempt with, so a link with an unknown piece plays (and is
    // ranked as) `random` on both sides rather than failing to start.
    const { selectedPiece } = legalMovesChallengeDefinition.parseSettings({
      selectedPiece: searchParams.piece,
    }) ?? { selectedPiece: 'random' as const };

    return <LegalMovesSession locale={locale} selectedPiece={selectedPiece} />;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
