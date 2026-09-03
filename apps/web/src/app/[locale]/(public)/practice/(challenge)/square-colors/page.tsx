import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { buildPracticeHelpTour } from '@/app/[locale]/(public)/practice/_lib/practice-help-tour';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { SquareColorsSetup } from './_components/SquareColorsSetup';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors',
  renderSetup: (locale) => <SquareColorsSetup locale={locale} />,
  renderTitleAction: (t) =>
    buildPracticeHelpTour(t, 'squareColors', 'square-colors', ['challenge', 'training']),
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
  leaderboard: {
    module: 'square_colors',
    defaultKey: 'default',
  },
});

export { generateMetadata };
export default Page;
