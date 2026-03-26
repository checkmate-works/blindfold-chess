import {
  createLeaderboardPracticeResultPage,
  createPracticeResultMetadata,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz/result',
});

export default createLeaderboardPracticeResultPage(ResultClient, {
  module: 'coordinate_quiz',
  resolveKey: (sp) => (typeof sp.orientation === 'string' ? sp.orientation : 'random'),
});
