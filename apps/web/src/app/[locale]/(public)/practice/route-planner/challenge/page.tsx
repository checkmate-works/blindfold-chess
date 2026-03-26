import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';

const RoutePlannerSession = dynamic(() =>
  import('../_components/RoutePlannerSession').then((mod) => mod.RoutePlannerSession)
);

const { generateMetadata, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/challenge',
  sessionLabelKey: 'session',
  staticParams: false,
  robots: { index: false, follow: false },
  showDivider: false,
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'session' },
  ],
  renderContent: ({ locale, searchParams }) => {
    // Parse problem count (default 5)
    const countParam = searchParams.count;
    let problemCount = 5;
    if (countParam && typeof countParam === 'string') {
      const parsed = parseInt(countParam);
      if (!isNaN(parsed) && parsed >= 1) {
        problemCount = parsed;
      }
    }

    // Parse allowed pieces
    const piecesParam = searchParams.pieces;
    let allowedPieces: PieceType[] = [];
    if (piecesParam && typeof piecesParam === 'string') {
      const potentialPieces = piecesParam.split('') as PieceType[];
      allowedPieces = potentialPieces.filter((p) => PIECES.includes(p));
    }
    if (allowedPieces.length === 0) {
      allowedPieces = [...PIECES];
    }

    // Parse tutorial mode params
    const mode = searchParams.mode === 'tutorial' ? 'tutorial' : 'standard';

    let initialProblem;
    if (mode === 'tutorial') {
      const piece = searchParams.piece as PieceType;
      const start = searchParams.start as string;
      const end = searchParams.end as string;

      if (piece && start && end) {
        initialProblem = { piece, start, end };
      }
    }

    return (
      <RoutePlannerSession
        locale={locale}
        problemCount={problemCount}
        allowedPieces={allowedPieces}
        mode={mode}
        initialProblem={initialProblem}
      />
    );
  },
});

export { generateMetadata };
export default Page;
