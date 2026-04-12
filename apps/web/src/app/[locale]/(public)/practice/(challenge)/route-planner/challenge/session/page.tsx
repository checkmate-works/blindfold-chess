import dynamic from 'next/dynamic';

import { CHALLENGE_TIME_LIMIT } from '@/lib/challenge-constants';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { PIECE_NAME_TO_TYPE, VALID_PIECE_NAMES } from '../../_lib/utils';
import type { PieceType } from '../../_lib/utils';

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
    const piece = searchParams.piece as string | undefined;
    const validPieceName =
      piece && (VALID_PIECE_NAMES as readonly string[]).includes(piece) ? piece : 'knight';
    const allowedPieces: PieceType[] = [PIECE_NAME_TO_TYPE[validPieceName]];

    return (
      <RoutePlannerChallengeSession
        locale={locale}
        initialTimeLimit={CHALLENGE_TIME_LIMIT}
        allowedPieces={allowedPieces}
      />
    );
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
