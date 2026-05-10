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
 * - Setup: the user can start a challenge or switch to training mode. A
 *   "View Tutorial" link is offered for first-time visitors; the help tour
 *   on this page also recommends viewing the tutorial first.
 * - Challenge: time-limited; the score is recorded and reflected on the
 *   leaderboard.
 * - Training: untimed free practice.
 * - Result: shows answer details (with a leaderboard preview in challenge
 *   mode).
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { HelpTourButton } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';

import { DiagonalQuizSetup } from './_components/DiagonalQuizSetup';

export const revalidate = 3600;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz',
  renderSetup: (locale) => <DiagonalQuizSetup locale={locale} />,
  renderTitleAction: (t) => {
    const steps: HelpStep[] = [
      {
        targetId: 'diagonal-quiz-tutorial',
        title: t('practice.diagonalQuiz.help.tutorial.title'),
        description: t('practice.diagonalQuiz.help.tutorial.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'diagonal-quiz-challenge',
        title: t('practice.diagonalQuiz.help.challenge.title'),
        description: t('practice.diagonalQuiz.help.challenge.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'diagonal-quiz-training',
        title: t('practice.diagonalQuiz.help.training.title'),
        description: t('practice.diagonalQuiz.help.training.description'),
        side: 'top',
        align: 'center',
      },
    ];
    return <HelpTourButton steps={steps} label={t('practice.diagonalQuiz.help.label')} />;
  },
  renderArticles: () => null,
  leaderboard: {
    module: 'diagonal_quiz',
    defaultKey: 'default',
  },
});

export { generateMetadata };
export default Page;
