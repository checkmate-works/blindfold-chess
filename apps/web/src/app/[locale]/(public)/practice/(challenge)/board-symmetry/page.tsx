import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { BoardSymmetrySetup } from './_components/BoardSymmetrySetup';

export const revalidate = 300;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry',
  renderSetup: (locale) => <BoardSymmetrySetup locale={locale} />,
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
