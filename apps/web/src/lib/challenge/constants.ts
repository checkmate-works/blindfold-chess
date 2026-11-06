/**
 * The challenge rules — `MISTAKE_LIMIT` (3) and `CHALLENGE_TIME_LIMIT` (60
 * seconds) — are defined in `packages/features/src/practice-registry/` so the
 * mobile app plays by the same numbers. They are re-exported here so web code
 * keeps importing from `@/lib/challenge/constants`; the reasons each value is
 * fixed are on the declarations there.
 */
export { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@blindfold-chess/features/practice-registry';
