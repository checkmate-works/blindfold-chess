import {
  createLeaderboardPracticeResultPage,
  createPracticeResultMetadata,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

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
});
