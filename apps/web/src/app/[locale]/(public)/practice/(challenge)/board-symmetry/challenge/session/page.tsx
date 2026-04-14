import dynamic from 'next/dynamic';

import { createPracticeChallengeSessionPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const BoardSymmetryChallenge = dynamic(() => import('../_components/BoardSymmetryChallenge'));

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengeSessionPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry/challenge/session',
  sessionLabelKey: 'session',
  breadcrumbSegments: [
    { labelKey: 'boardSymmetry.title', href: '/practice/board-symmetry' },
    { labelKey: 'modeTimed', href: '/practice/board-symmetry/challenge' },
    { labelKey: 'boardSymmetry.session' },
  ],
  renderContent: ({ locale }) => <BoardSymmetryChallenge locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
