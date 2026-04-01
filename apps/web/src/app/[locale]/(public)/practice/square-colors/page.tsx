import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { createPracticeTopPage } from '../_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '../_lib/practice-emojis';
import { SquareColorsSetup } from './_components/SquareColorsSetup';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors',
  renderSetup: (locale) => <SquareColorsSetup locale={locale} />,
  renderArticles: (t, locale) => (
    <div className="mt-8 space-y-3">
      <SectionTitle>{t('practice.squareColors.requiredKnowledge')}</SectionTitle>
      <CardLink
        href="/learn/coordinates/square-colors"
        icon={PRACTICE_EMOJIS.square_colors}
        title={t('practice.squareColors.viewArticle')}
        description={t('practice.squareColors.articleDescription')}
        locale={locale}
      />
    </div>
  ),
});

export { generateMetadata };
export default Page;
