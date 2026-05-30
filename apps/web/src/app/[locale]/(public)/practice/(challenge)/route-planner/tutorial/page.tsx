import dynamic from 'next/dynamic';

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
  renderTutorial: (locale) => <RoutePlannerTutorial locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
