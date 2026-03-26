import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { CoordinateQuizChallengeSetup } from './_components/CoordinateQuizChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz/challenge',
  breadcrumbSegments: [
    { labelKey: 'coordinateQuiz.title', href: '/practice/coordinate-quiz' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <CoordinateQuizChallengeSetup
      locale={locale}
      boardOrientation={(searchParams.orientation as string) || 'white'}
      feedbackSpeed={(searchParams.feedbackSpeed as string) || 'normal'}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
