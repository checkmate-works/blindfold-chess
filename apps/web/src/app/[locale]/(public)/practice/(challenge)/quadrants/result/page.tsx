import { PracticeResultLoadingSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultLoadingSkeleton';
import {
  createPracticeResultMetadata,
  createSimplePracticeResultPage,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/result',
});

export default createSimplePracticeResultPage(ResultClient, {
  // Quadrants awards EXP but disables the sign-up banner (showSignUpBanner:
  // false). Reserve only EXP, consistent with loading.tsx.
  loadingFallback: <PracticeResultLoadingSkeleton grantsExp />,
});
