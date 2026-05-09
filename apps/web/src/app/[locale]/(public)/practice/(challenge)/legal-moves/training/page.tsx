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

import {
  PIECE_NAME_TO_TYPE,
  VALID_PIECE_NAMES,
} from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/query-params';
import type { PieceType } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/types';
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
    const piece = searchParams.piece as string | undefined;
    const allPieceTypes: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
    const validPieceName =
      piece && (VALID_PIECE_NAMES as readonly string[]).includes(piece) ? piece : 'random';
    const selectedPieces: PieceType[] =
      validPieceName === 'random' ? allPieceTypes : [PIECE_NAME_TO_TYPE[validPieceName]];

    return <LegalMovesTrainingSession locale={locale} selectedPieces={selectedPieces} />;
  },
});

export { generateMetadata };
export default Page;
