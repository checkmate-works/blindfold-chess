/**
 * Board Symmetry (ボードの対称性, `/practice/board-symmetry`)
 *
 * @description
 * Top page of the board-symmetry practice: the setup form, a help tour, the related article and the leaderboard.
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';
import { buildPracticeHelpTour } from '@/app/[locale]/(public)/practice/_lib/practice-help-tour';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { BoardSymmetrySetup } from './_components/BoardSymmetrySetup';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'boardSymmetry',
  canonicalPath: 'practice/board-symmetry',
  renderSetup: (locale) => <BoardSymmetrySetup locale={locale} />,
  renderTitleAction: (t) =>
    buildPracticeHelpTour(t, 'boardSymmetry', 'board-symmetry', [
      'tutorial',
      'challenge',
      'training',
    ]),
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
