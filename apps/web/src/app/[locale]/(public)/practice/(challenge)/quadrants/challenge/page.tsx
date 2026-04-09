import { createPracticeChallengePage } from '@/app/[locale]/(public)/practice/_lib/createPracticeSessionPages';

import { QuadrantsChallengeSetup } from './_components/QuadrantsChallengeSetup';

const { generateMetadata, generateStaticParams, Page } = createPracticeChallengePage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants/challenge',
  breadcrumbSegments: [
    { labelKey: 'quadrantAnchors.title', href: '/practice/quadrants' },
    { labelKey: 'modeTimed' },
  ],
  renderContent: ({ locale }) => <QuadrantsChallengeSetup locale={locale} />,
});

export { generateMetadata, generateStaticParams };
export default Page;
