import dynamic from 'next/dynamic';

import type { PieceType } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/types';
import { PIECE_NAME_TO_TYPE } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/utils';
import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const LegalMovesSession = dynamic(() => import('../_components/LegalMovesSession'));

const VALID_PIECE_NAMES = ['king', 'queen', 'rook', 'bishop', 'knight', 'random'] as const;

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
    const piece = searchParams.piece as string | undefined;
    const allPieceTypes: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
    const validPieceName =
      piece && (VALID_PIECE_NAMES as readonly string[]).includes(piece) ? piece : 'random';
    const selectedPieces: PieceType[] =
      validPieceName === 'random' ? allPieceTypes : [PIECE_NAME_TO_TYPE[validPieceName]];

    return (
      <LegalMovesSession
        locale={locale}
        selectedPieces={selectedPieces}
        selectedPiece={validPieceName}
      />
    );
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
