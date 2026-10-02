import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { parseOrientationSeed } from '../_lib/query-params';
import { CoordinateQuizChallengeSetup } from './_components/CoordinateQuizChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz/challenge',
  practiceId: 'coordinate-quiz',
  breadcrumbSegments: [
    { labelKey: 'coordinateQuiz.title', href: '/practice/coordinate-quiz' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <CoordinateQuizChallengeSetup
      locale={locale}
      initialBoardOrientation={parseOrientationSeed(searchParams.orientation)}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
