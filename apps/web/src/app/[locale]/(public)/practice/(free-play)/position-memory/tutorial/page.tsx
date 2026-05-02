import dynamic from 'next/dynamic';

import { ModuleTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const PositionMemoryTutorial = dynamic(() =>
  import('../_components/PositionMemoryTutorial').then((mod) => mod.PositionMemoryTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'positionMemory',
  canonicalPath: 'practice/position-memory/tutorial',
  descriptionKey: 'tutorial.description',
  breadcrumbSegments: [
    { labelKey: 'positionMemory.title', href: '/practice/position-memory' },
    { labelKey: 'positionMemory.tutorial.title' },
  ],
  renderSkipLink: (locale) => <ModuleTutorialSkipLink locale={locale} moduleId="positionMemory" />,
  renderTutorial: (locale) => <PositionMemoryTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
