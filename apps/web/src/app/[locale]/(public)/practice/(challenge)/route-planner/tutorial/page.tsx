import dynamic from 'next/dynamic';

import { ModuleTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import { createPracticeTutorialPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

const RoutePlannerTutorial = dynamic(() =>
  import('../_components/RoutePlannerTutorial').then((mod) => mod.RoutePlannerTutorial)
);

const { generateMetadata, generateStaticParams, Page } = createPracticeTutorialPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/tutorial',
  breadcrumbSegments: [
    { labelKey: 'routePlanner.title', href: '/practice/route-planner' },
    { labelKey: 'routePlanner.tutorial.title' },
  ],
  renderSkipLink: (locale) => <ModuleTutorialSkipLink locale={locale} moduleId="routePlanner" />,
  renderTutorial: (locale) => <RoutePlannerTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
