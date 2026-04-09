import dynamic from 'next/dynamic';

import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { TutorialSectionTitle } from '../_components/TutorialSectionTitle';
import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const MoveSequenceTutorial = dynamic(() =>
  import('../_components/MoveSequenceTutorial').then((mod) => mod.MoveSequenceTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'moveSequence',
  canonicalPath: 'practice/move-sequence/tutorial',
  descriptionKey: 'tutorial.description',
  usePagePanel: false,
  breadcrumbSegments: [
    { labelKey: 'moveSequence.title', href: '/practice/move-sequence' },
    { labelKey: 'moveSequence.tutorial.title' },
  ],
  renderSectionTitle: () => <TutorialSectionTitle />,
  renderSkipLink: (locale) => <TutorialSkipLink locale={locale} />,
  renderTutorial: (locale) => <MoveSequenceTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
