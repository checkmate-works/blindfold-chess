import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { DiagonalQuizChallengeSetup } from './_components/DiagonalQuizChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz/challenge',
  breadcrumbSegments: [
    { labelKey: 'diagonalQuiz.title', href: '/practice/diagonal-quiz' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale }) => <DiagonalQuizChallengeSetup locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
