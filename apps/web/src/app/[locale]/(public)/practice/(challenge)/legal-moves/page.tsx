import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { LegalMoves } from './_components/LegalMoves';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'legalMoves',
  canonicalPath: 'practice/legal-moves',
  renderSetup: (locale) => <LegalMoves locale={locale} />,
  renderArticles: (t, locale) => (
    <div className="mt-8 space-y-4">
      <SectionTitle>{t('practice.legalMoves.relatedArticles')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardLink
          href="/learn/moves/king-movement"
          icon="♔"
          title={t('practice.legalMoves.articles.king.title')}
          description={t('practice.legalMoves.articles.king.description')}
          locale={locale}
        />
        <CardLink
          href="/learn/moves/knight-movement"
          icon="♘"
          title={t('practice.legalMoves.articles.knight.title')}
          description={t('practice.legalMoves.articles.knight.description')}
          locale={locale}
        />
        <CardLink
          href="/learn/moves/rook-movement"
          icon="♜"
          title={t('practice.legalMoves.articles.rook.title')}
          description={t('practice.legalMoves.articles.rook.description')}
          locale={locale}
        />
        <CardLink
          href="/learn/moves/bishop-movement"
          icon="♗"
          title={t('practice.legalMoves.articles.bishop.title')}
          description={t('practice.legalMoves.articles.bishop.description')}
          locale={locale}
        />
      </div>
    </div>
  ),
  leaderboard: {
    module: 'legal_moves',
    defaultKey: 'random',
  },
});

export { generateMetadata };
export default Page;
