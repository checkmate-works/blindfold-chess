'use client';

import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import { createChallengeSetup } from '@/app/[locale]/(public)/practice/(challenge)/_components/create-challenge-setup';

export const BoardSymmetryChallengeSetup = createChallengeSetup({
  moduleSlug: 'board-symmetry',
  rules: (t) => <StandardChallengeRules t={t} />,
});
