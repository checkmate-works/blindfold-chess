'use client';

import { CHALLENGE_TIME_LIMIT } from '@/lib/challenge/constants';

import { createChallengeSetup } from '@/app/[locale]/(public)/practice/(challenge)/_components/create-challenge-setup';

export const DiagonalQuizChallengeSetup = createChallengeSetup({
  moduleSlug: 'diagonal-quiz',
  buildQuery: () => new URLSearchParams({ timeLimit: CHALLENGE_TIME_LIMIT.toString() }),
  rules: (t) => (
    <>
      <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
      <li>{t('challengeSetup.noMistakeLimit')}</li>
      <li>{t('challengeSetup.leaderboard')}</li>
    </>
  ),
});
