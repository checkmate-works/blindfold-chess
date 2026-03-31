import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { createPracticeTopPage } from '../_lib/createPracticeTopPage';
import CoordinateQuiz from './_components/CoordinateQuiz';

const { dynamic, generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz',
  renderSetup: (locale) => <CoordinateQuiz locale={locale} />,
  renderArticles: (t, locale) => (
    <div className="mt-8 space-y-4">
      <SectionTitle>{t('practice.coordinateQuiz.relatedArticles')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardLink
          href="/learn/coordinates/coordinate-confusion"
          icon="🔄"
          title={t('practice.coordinateQuiz.articles.coordinateConfusion.title')}
          description={t('practice.coordinateQuiz.articles.coordinateConfusion.description')}
          locale={locale}
        />
        <CardLink
          href="/learn/coordinates/anchor-squares"
          icon="⚓"
          title={t('practice.coordinateQuiz.articles.anchorSquares.title')}
          description={t('practice.coordinateQuiz.articles.anchorSquares.description')}
          locale={locale}
        />
        <CardLink
          href="/learn/notation/algebraic-notation"
          icon="🔤"
          title={t('practice.coordinateQuiz.articles.algebraicNotation.title')}
          description={t('practice.coordinateQuiz.articles.algebraicNotation.description')}
          locale={locale}
        />
      </div>
    </div>
  ),
});

export { dynamic, generateMetadata };
export default Page;
