import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { buildPracticeHelpTour } from '@/app/[locale]/(public)/practice/_lib/practice-help-tour';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import CoordinateQuiz from './_components/CoordinateQuiz';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'coordinateQuiz',
  canonicalPath: 'practice/coordinate-quiz',
  renderSetup: (locale) => <CoordinateQuiz locale={locale} />,
  renderTitleAction: (t) =>
    buildPracticeHelpTour(t, 'coordinateQuiz', 'coordinate-quiz', [
      'feedbackSpeed',
      'challenge',
      'training',
    ]),
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
  leaderboard: {
    module: 'coordinate_quiz',
    defaultKey: 'random',
  },
});

export { generateMetadata };
export default Page;
