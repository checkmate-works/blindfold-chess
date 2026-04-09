import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const FenTutorial = dynamic(() =>
  import('../_components/FenTutorial').then((mod) => mod.FenTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'fen',
  canonicalPath: 'practice/fen/tutorial',
  descriptionKey: 'tutorial.description',
  usePagePanel: false,
  breadcrumbSegments: [
    { labelKey: 'fen.title', href: '/practice/fen' },
    { labelKey: 'fen.tutorial.title' },
  ],
  renderSkipLink: (locale) => <TutorialSkipLink locale={locale} />,
  renderTutorial: (locale) => <FenTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
