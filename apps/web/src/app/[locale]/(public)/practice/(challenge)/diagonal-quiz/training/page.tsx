/**
 * Diagonal Quiz Training
 *
 * @description
 * Untimed training mode for diagonal identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite Q&A -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const DiagonalQuizTrainingSession = dynamic(
  () => import('./_components/DiagonalQuizTrainingSession')
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTrainingPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz/training',
  breadcrumbSegments: [
    { labelKey: 'diagonalQuiz.title', href: '/practice/diagonal-quiz' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale }) => <DiagonalQuizTrainingSession locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
