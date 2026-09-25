/**
 * Legal Moves Training
 *
 * @description
 * Untimed training mode for legal move identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite Q&A -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { parsePieceParam } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/query-params';
import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const LegalMovesTrainingSession = dynamic(() => import('./_components/LegalMovesTrainingSession'));

const { generateMetadata, Page } = createPracticeTrainingPage({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/training',
  staticParams: false,
  breadcrumbSegments: [
    { labelKey: 'legalMoves.title', href: '/practice/legal-moves' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale, searchParams }) => {
    const { selectedPiece, selectedPieces } = parsePieceParam(
      searchParams.piece as string | undefined
    );

    return (
      <LegalMovesTrainingSession
        locale={locale}
        selectedPieces={selectedPieces}
        selectedPiece={selectedPiece}
      />
    );
  },
});

export { generateMetadata };
export default Page;
