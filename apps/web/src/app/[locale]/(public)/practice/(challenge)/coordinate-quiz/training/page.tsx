/**
 * Coordinate Quiz Training
 *
 * @description
 * Untimed training mode for coordinate identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite Q&A -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const CoordinateQuizTrainingSession = dynamic(
  () => import('./_components/CoordinateQuizTrainingSession')
);

const { generateMetadata, Page } = createPracticeTrainingPage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz/training',
  staticParams: false,
  breadcrumbSegments: [
    { labelKey: 'coordinateQuiz.title', href: '/practice/coordinate-quiz' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale, searchParams }) => (
    <CoordinateQuizTrainingSession
      locale={locale}
      boardOrientation={(searchParams.orientation as string) || 'white'}
      feedbackSpeed={(searchParams.feedbackSpeed as string) || 'normal'}
    />
  ),
});

export { generateMetadata };
export default Page;
