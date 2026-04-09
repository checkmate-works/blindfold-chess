import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const PositionMemoryTutorial = dynamic(() =>
  import('../_components/PositionMemoryTutorial').then((mod) => mod.PositionMemoryTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'positionMemory',
  canonicalPath: 'practice/position-memory/tutorial',
  descriptionKey: 'tutorial.description',
  usePagePanel: false,
  breadcrumbSegments: [
    { labelKey: 'positionMemory.title', href: '/practice/position-memory' },
    { labelKey: 'positionMemory.tutorial.title' },
  ],
  renderSkipLink: (locale) => <TutorialSkipLink locale={locale} />,
  renderTutorial: (locale) => <PositionMemoryTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
