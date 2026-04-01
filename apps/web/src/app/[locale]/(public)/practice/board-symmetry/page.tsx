import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { createPracticeTopPage } from '../_lib/createPracticeTopPage';
import { PRACTICE_EMOJIS } from '../_lib/practice-emojis';
import { BoardSymmetrySetup } from './_components/BoardSymmetrySetup';

export const dynamic = 'force-dynamic';

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
});

export { generateMetadata };
export default Page;
