'use client';

import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import { createChallengeSetup } from '@/app/[locale]/(public)/practice/(challenge)/_components/create-challenge-setup';

export const SquareColorsChallengeSetup = createChallengeSetup({
  moduleSlug: 'square-colors',
  rules: (t) => <StandardChallengeRules t={t} />,
});
