'use client';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { createChallengeSetup } from '@/app/[locale]/(public)/practice/(challenge)/_components/create-challenge-setup';

export const BoardSymmetryChallengeSetup = createChallengeSetup({
  moduleSlug: 'board-symmetry',
  rules: (t) => (
    <>
      <li>{t('challengeSetup.timeLimit', { seconds: 60 })}</li>
      <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
      <li>{t('challengeSetup.leaderboard')}</li>
    </>
  ),
});
