import {
  createPracticeResultMetadata,
  createSimplePracticeResultPage,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'fen',
  canonicalPath: 'practice/fen/result',
});

export default createSimplePracticeResultPage(ResultClient);
