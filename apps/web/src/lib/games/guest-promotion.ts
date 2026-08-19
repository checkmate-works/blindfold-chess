import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { RankSlug } from '@/lib/db/data/ranks';
import { isGamePublishWinHiddenBoardRequirement, ranksSeedData } from '@/lib/db/data/ranks';

import { isConstrainedPlaySettings, maintainedHiddenBoard } from './play-settings-constraint';
import { normalizePlaySettingsLog } from './play-settings-log';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PreferenceChangeLogEntry,
} from './saved-game-types';
import { startedFromStandardPosition } from './standard-start';

/** The two ranks a single published win can satisfy the game requirement of. */
export type GuestPromotionQualification = Extract<RankSlug, '1kyu' | '1dan'>;

/**
 * The 1dan game requirement from the seed data — the single source for the
 * peek allowance, so this hint and the server evaluator cannot disagree on
 * the number. `undefined` would mean the seed no longer carries the
 * requirement; the dan check is then skipped rather than guessed.
 */
const danSeedRequirement = ranksSeedData
  .find((rank) => rank.slug === '1dan')
  ?.requirements.find(isGamePublishWinHiddenBoardRequirement);

type Args = {
  /** The player's terminal result. Only a win can qualify. */
  result: FinalGameOutcome | null;
  /**
   * The START-OF-GAME settings snapshot — what publish persists to
   * `games.play_settings` and what the server evaluator grades.
   */
  playSettings: GamePlaySettings | null | undefined;
  /** The mid-game preference change log (`Game.preferenceChangeLog`). */
  changeLog: readonly PreferenceChangeLogEntry[] | null | undefined;
  /** Per-move aid counts (`Game.operationLogs`) — source of the peek total. */
  operationLogs: readonly MoveOperationLog[] | null | undefined;
  /** Half-moves played — bounds the change-log normalization. */
  moveCount: number;
  /**
   * The position the game started from (`Game.startingFen`); absent means
   * the standard start. Together with `setupPlies` this feeds the 1dan bar's
   * "played from move 1" test — see {@link startedFromStandardPosition}.
   */
  startingFen: string | null | undefined;
  /** Seeded setup-prefix length (`Game.setupPlies`); absent means none. */
  setupPlies: number | null | undefined;
};

/**
 * Which rank's game requirement this finished game satisfies, for the
 * signed-out finish-modal pitch: `'1dan'` (the stricter bar) wins over
 * `'1kyu'`, `null` means no pitch.
 *
 * A UI hint only — the authority is the server evaluator over the published
 * row (`rank-evaluation.ts`). To keep the two from drifting, every predicate
 * here is the same pure function the server runs: `startedFromStandardPosition`
 * gates the 1dan bar on a standard start, `maintainedHiddenBoard` and
 * `isConstrainedPlaySettings` grade the settings, `normalizePlaySettingsLog`
 * is the exact publish-time normalization of the change log, and the peek
 * allowance comes from the 1dan seed requirement itself.
 *
 * Ranks are evaluated independently (skip-grants allowed), so the pitch this
 * feeds can promise promotion outright: a signed-out player who signs up and
 * publishes this game is granted the named rank immediately, even with no
 * lower ranks at all.
 */
export function classifyGuestPromotionQualification({
  result,
  playSettings,
  changeLog,
  operationLogs,
  moveCount,
  startingFen,
  setupPlies,
}: Args): GuestPromotionQualification | null {
  if (result !== 'win' || !playSettings) return null;

  if (danSeedRequirement && startedFromStandardPosition(startingFen, setupPlies)) {
    const normalizedLog = normalizePlaySettingsLog(changeLog ?? null, moveCount);
    const peeks = (operationLogs ?? []).reduce((sum, log) => sum + log.peekCount, 0);
    if (
      maintainedHiddenBoard(playSettings, normalizedLog) &&
      peeks <= danSeedRequirement.maxPeeks
    ) {
      return '1dan';
    }
  }

  if (isConstrainedPlaySettings(playSettings)) return '1kyu';

  return null;
}
