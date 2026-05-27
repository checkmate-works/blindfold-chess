import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { CardLink, HelpTourButton, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';

import { BoardSymmetrySetup } from './_components/BoardSymmetrySetup';

export const revalidate = 3600;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry',
  renderSetup: (locale) => <BoardSymmetrySetup locale={locale} />,
  renderTitleAction: (t) => {
    const steps: HelpStep[] = [
      {
        targetId: 'board-symmetry-tutorial',
        title: t('practice.boardSymmetry.help.tutorial.title'),
        description: t('practice.boardSymmetry.help.tutorial.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'board-symmetry-challenge',
        title: t('practice.boardSymmetry.help.challenge.title'),
        description: t('practice.boardSymmetry.help.challenge.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'board-symmetry-training',
        title: t('practice.boardSymmetry.help.training.title'),
        description: t('practice.boardSymmetry.help.training.description'),
        side: 'top',
        align: 'center',
      },
    ];
    return <HelpTourButton steps={steps} label={t('practice.boardSymmetry.help.label')} />;
  },
  renderArticles: (t, locale) => (
    <div className="mt-8 space-y-3">
      <SectionTitle>{t('practice.boardSymmetry.requiredKnowledge')}</SectionTitle>
      <CardLink
        href="/learn/coordinates/board-symmetry"
        icon={PRACTICE_EMOJIS.board_symmetry}
        title={t('practice.boardSymmetry.viewArticle')}
        description={t('practice.boardSymmetry.articleDescription')}
        locale={locale}
      />
    </div>
  ),
  leaderboard: {
    module: 'board_symmetry',
    defaultKey: 'default',
  },
});

export { generateMetadata };
export default Page;
