import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const DiagonalQuizTutorial = dynamic(() =>
  import('../_components/DiagonalQuizTutorial').then((mod) => mod.DiagonalQuizTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz/tutorial',
  breadcrumbSegments: [
    { labelKey: 'diagonalQuiz.title', href: '/practice/diagonal-quiz' },
    { labelKey: 'diagonalQuiz.tutorial.title' },
  ],
  renderTutorial: (locale) => <DiagonalQuizTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
