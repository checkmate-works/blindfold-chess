'use client';

import { createChallengeSetup } from '@/app/[locale]/(public)/practice/(challenge)/_components/create-challenge-setup';

const DEFAULT_TIME_LIMIT = 60;

export const DiagonalQuizChallengeSetup = createChallengeSetup({
  moduleSlug: 'diagonal-quiz',
  buildQuery: () => new URLSearchParams({ timeLimit: DEFAULT_TIME_LIMIT.toString() }),
  rules: (t) => (
    <>
      <li>{t('challengeSetup.timeLimit', { seconds: DEFAULT_TIME_LIMIT })}</li>
      <li>{t('challengeSetup.noMistakeLimit')}</li>
      <li>{t('challengeSetup.leaderboard')}</li>
    </>
  ),
});
