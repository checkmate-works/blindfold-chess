/**
 * Board Symmetry Training (ボードの対称性トレーニング)
 *
 * @description
 * Untimed training mode for board symmetry identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite Q&A -> End button -> Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const BoardSymmetryTrainingSession = dynamic(
  () => import('./_components/BoardSymmetryTrainingSession')
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTrainingPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry/training',
  breadcrumbSegments: [
    { labelKey: 'boardSymmetry.title', href: '/practice/board-symmetry' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale }) => <BoardSymmetryTrainingSession locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
