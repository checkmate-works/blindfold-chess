import { PracticeResultLoadingSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultLoadingSkeleton';
import {
  createLeaderboardPracticeResultPage,
  createPracticeResultMetadata,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves/result',
});

export default createLeaderboardPracticeResultPage(ResultClient, {
  module: 'legal_moves',
  resolveKey: (sp) => (typeof sp.piece === 'string' ? sp.piece : 'random'),
  adSlots: { wide: false, standard: true },
  // Keep the inner chunk-load fallback consistent with loading.tsx.
  loadingFallback: <PracticeResultLoadingSkeleton grantsExp showsSignUpBanner showsRecordSection />,
});
