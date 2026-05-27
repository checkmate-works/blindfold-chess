import dynamic from 'next/dynamic';

import { ModuleTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const FenTutorial = dynamic(() =>
  import('../_components/FenTutorial').then((mod) => mod.FenTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'fen',
  canonicalPath: 'practice/fen/tutorial',
  descriptionKey: 'tutorial.description',
  breadcrumbSegments: [
    { labelKey: 'fen.title', href: '/practice/fen' },
    { labelKey: 'fen.tutorial.title' },
  ],
  renderSkipLink: (locale) => <ModuleTutorialSkipLink locale={locale} moduleId="fen" />,
  renderTutorial: (locale) => <FenTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
