/**
 * Square Colors Training (マスの色トレーニング)
 *
 * @description
 * Untimed training mode for square color identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page — navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) → Infinite Q&A → End button → Setup + toast
 */
import dynamic from 'next/dynamic';

import { createPracticeTrainingPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const SquareColorsTrainingSession = dynamic(
  () => import('./_components/SquareColorsTrainingSession')
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTrainingPage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors/training',
  breadcrumbSegments: [
    { labelKey: 'squareColors.title', href: '/practice/square-colors' },
    { labelKey: 'modeTraining' },
  ],
  renderContent: ({ locale }) => <SquareColorsTrainingSession locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
