import {
  createPracticeResultMetadata,
  createSimplePracticeResultPage,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { KnightTourResultLoadingSkeleton } from './KnightTourResultLoadingSkeleton';
import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'knightTour',
  canonicalPath: 'practice/knight-tour/result',
});

export default createSimplePracticeResultPage(ResultClient, {
  // Knight-tour's result is a custom board layout; keep the inner chunk-load
  // fallback consistent with the bespoke route loading.tsx.
  loadingFallback: <KnightTourResultLoadingSkeleton />,
});
