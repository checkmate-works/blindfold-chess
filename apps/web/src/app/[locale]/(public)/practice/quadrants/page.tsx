import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { createPracticeTopPage } from '../_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '../_lib/practice-emojis';
import { QuadrantsSetup } from './_components/QuadrantsSetup';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'quadrantAnchors',
  canonicalPath: 'practice/quadrants',
  renderSetup: (locale) => <QuadrantsSetup locale={locale} />,
  renderArticles: (t, locale) => (
    <div className="mt-8 space-y-3">
      <SectionTitle>{t('practice.quadrantAnchors.relatedArticles')}</SectionTitle>
      <CardLink
        href="/learn/coordinates/anchor-squares"
        icon={PRACTICE_EMOJIS.quadrant_anchors}
        title={t('practice.quadrantAnchors.articles.anchorSquares.title')}
        description={t('practice.quadrantAnchors.articles.anchorSquares.description')}
        locale={locale}
      />
    </div>
  ),
});

export { generateMetadata };
export default Page;
