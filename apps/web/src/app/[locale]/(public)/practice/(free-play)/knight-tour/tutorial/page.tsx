import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const KnightTourTutorial = dynamic(() =>
  import('../_components/KnightTourTutorial').then((mod) => mod.KnightTourTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'knightTour',
  canonicalPath: 'practice/knight-tour/tutorial',
  descriptionKey: 'tutorial.description',
  usePagePanel: false,
  breadcrumbSegments: [
    { labelKey: 'knightTour.title', href: '/practice/knight-tour' },
    { labelKey: 'knightTour.tutorial.title' },
  ],
  renderSkipLink: (locale) => <TutorialSkipLink locale={locale} />,
  renderTutorial: (locale) => <KnightTourTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
