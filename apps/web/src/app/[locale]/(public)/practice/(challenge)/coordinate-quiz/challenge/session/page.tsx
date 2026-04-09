import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const CoordinateQuizChallenge = dynamic(() => import('../_components/CoordinateQuizChallenge'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'coordinateQuiz.title', href: '/practice/coordinate-quiz' },
    { labelKey: 'modeTimed', href: '/practice/coordinate-quiz/challenge' },
    { labelKey: 'coordinateQuiz.session' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <CoordinateQuizChallenge
      locale={locale}
      initialBoardOrientation={(searchParams.orientation as string) || 'white'}
      initialFeedbackSpeed={(searchParams.feedbackSpeed as string) || 'normal'}
    />
  ),
});

export { generateMetadata, generateStaticParams };
export default Page;
