import {
  createLeaderboardPracticeResultPage,
  createPracticeResultMetadata,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors/result',
});

export default createLeaderboardPracticeResultPage(ResultClient, {
  module: 'square_colors',
  resolveKey: () => 'default',
});
