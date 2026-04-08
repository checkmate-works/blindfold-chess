import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { BoardSymmetryTutorialSkipLink } from '../_components/BoardSymmetryTutorialSkipLink';

const BoardSymmetryTutorial = dynamic(() =>
  import('../_components/BoardSymmetryTutorial').then((mod) => mod.BoardSymmetryTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry/tutorial',
  descriptionKey: 'tutorial.description',
  breadcrumbSegments: [
    { labelKey: 'boardSymmetry.title', href: '/practice/board-symmetry' },
    { labelKey: 'boardSymmetry.tutorial.title' },
  ],
  renderSkipLink: (locale) => <BoardSymmetryTutorialSkipLink locale={locale} />,
  renderTutorial: (locale) => <BoardSymmetryTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
