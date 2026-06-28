import {
  createLeaderboardPracticeResultPage,
  createPracticeResultMetadata,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';
import { RoutePlannerResultLoadingSkeleton } from './RoutePlannerResultLoadingSkeleton';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/result',
});

export default createLeaderboardPracticeResultPage(ResultClient, {
  module: 'route_planner',
  resolveKey: (searchParams) => {
    const piece = typeof searchParams.piece === 'string' ? searchParams.piece : undefined;
    return piece || 'knight';
  },
  // route-planner's loading.tsx is bespoke (Problem Details list between the
  // summary and the buttons); use the same skeleton for the inner-Suspense
  // chunk-load fallback so the shape stays continuous instead of dropping to
  // the shared skeleton.
  loadingFallback: <RoutePlannerResultLoadingSkeleton />,
});
