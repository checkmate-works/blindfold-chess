import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const DiagonalQuizSession = dynamic(() => import('../_components/DiagonalQuizSession'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'diagonalQuiz.title', href: '/practice/diagonal-quiz' },
    { labelKey: 'modeTimed', href: '/practice/diagonal-quiz/challenge' },
    { labelKey: 'diagonalQuiz.session' },
  ],
  renderContent: ({ locale, searchParams }) => {
    const timeLimitValue = searchParams.timeLimit
      ? parseInt(searchParams.timeLimit as string, 10)
      : 60;
    return <DiagonalQuizSession locale={locale} initialTimeLimit={timeLimitValue} />;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
