/**
 * Diagonal Quiz (`/practice/diagonal-quiz`)
 *
 * @description
 * Practice module in which the user names the diagonals that a given square
 * belongs to. A square coordinate (e.g. `e4`) is presented, and the user
 * answers with the endpoint pair of both the diagonal and the anti-diagonal
 * that pass through that square.
 *
 * @flow
 * - Tutorial: redirects first-time visitors to the tutorial (skippable;
 *   the skip state is remembered in localStorage).
 * - Setup: after the tutorial, the user can start a challenge or switch to
 *   training mode.
 * - Challenge: time-limited; the score is recorded and reflected on the
 *   leaderboard.
 * - Training: untimed free practice.
 * - Result: shows answer details (with a leaderboard preview in challenge
 *   mode).
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';

import { DiagonalQuizPageContent } from './_components/DiagonalQuizPageContent';

export const revalidate = 300;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz',
  renderSetup: (locale) => <DiagonalQuizPageContent locale={locale} />,
  renderArticles: () => null,
  leaderboard: {
    module: 'diagonal_quiz',
    defaultKey: 'default',
  },
});

export { generateMetadata };
export default Page;
