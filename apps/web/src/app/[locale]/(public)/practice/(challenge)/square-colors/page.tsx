import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { CardLink, HelpTourButton, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';

import { SquareColorsSetup } from './_components/SquareColorsSetup';

export const revalidate = 300;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'squareColors',
  canonicalPath: 'practice/square-colors',
  renderSetup: (locale) => <SquareColorsSetup locale={locale} />,
  renderTitleAction: (t) => {
    const steps: HelpStep[] = [
      {
        targetId: 'square-colors-challenge',
        title: t('practice.squareColors.help.challenge.title'),
        description: t('practice.squareColors.help.challenge.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'square-colors-training',
        title: t('practice.squareColors.help.training.title'),
        description: t('practice.squareColors.help.training.description'),
        side: 'top',
        align: 'center',
      },
    ];
    return <HelpTourButton steps={steps} label={t('practice.squareColors.help.label')} />;
  },
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
