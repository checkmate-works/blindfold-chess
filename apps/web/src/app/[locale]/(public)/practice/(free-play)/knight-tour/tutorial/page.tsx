import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const KnightTourTutorial = dynamic(() =>
  import('../_components/KnightTourTutorial').then((mod) => mod.KnightTourTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'knightTour',
  canonicalPath: 'practice/knight-tour/tutorial',
  descriptionKey: 'tutorial.description',
  breadcrumbSegments: [
    { labelKey: 'knightTour.title', href: '/practice/knight-tour' },
    { labelKey: 'knightTour.tutorial.title' },
  ],
  renderTutorial: (locale) => <KnightTourTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
