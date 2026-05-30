import dynamic from 'next/dynamic';

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
  renderTutorial: (locale) => <FenTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
