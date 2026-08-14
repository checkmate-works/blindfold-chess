import type { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

type PracticeTranslator = ReturnType<typeof useTranslations>;

/**
 * The rule list every leaderboard-backed challenge shows: the fixed time
 * limit, the mistake ceiling, and that the score is ranked.
 *
 * Five modules rendered these three `<li>`s identically, and three of them
 * had drifted off {@link CHALLENGE_TIME_LIMIT} onto a literal `60` — so the
 * constant that documents itself as "challenges are always 60 seconds" was
 * not actually the thing the screens read.
 *
 * Modules whose rules genuinely differ do NOT take a variant flag here: the
 * quadrant drill (unranked) and the diagonal quiz (no mistake ceiling) write
 * their own list, because a prop toggling a line off would make this
 * component describe two different games.
 */
export function StandardChallengeRules({ t }: { t: PracticeTranslator }) {
  return (
    <>
      <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
      <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
      <li>{t('challengeSetup.leaderboard')}</li>
    </>
  );
}
