import type { RankSlug } from '@/lib/db/data/ranks';
import { isGamePublishWinHiddenBoardRequirement, ranksSeedData } from '@/lib/db/data/ranks';

import { isConstrainedPlaySettings, maintainedHiddenBoard } from './play-settings-constraint';
import { normalizePlaySettingsLog } from './play-settings-log';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PreferenceChangeLogEntry,
} from './saved-game-types';

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
  result: 'win' | 'loss' | 'draw' | null;
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
};

/**
 * Which rank's game requirement this finished game satisfies, for the
 * signed-out finish-modal pitch: `'1dan'` (the stricter bar) wins over
 * `'1kyu'`, `null` means no pitch.
 *
 * A UI hint only — the authority is the server evaluator over the published
 * row (`rank-evaluation.ts`). To keep the two from drifting, every predicate
 * here is the same pure function the server runs: `maintainedHiddenBoard` and
 * `isConstrainedPlaySettings` grade the settings, `normalizePlaySettingsLog`
 * is the exact publish-time normalization of the change log, and the peek
 * allowance comes from the 1dan seed requirement itself.
 *
 * Note the phrasing this feeds must stay honest: belt progression is linear
 * from 5kyu, so a signed-out player who signs up does NOT get the rank from
 * this game immediately — the published game counts automatically once their
 * progression reaches it (the grant cascade handles multi-rank passes).
 */
export function classifyGuestPromotionQualification({
  result,
  playSettings,
  changeLog,
  operationLogs,
  moveCount,
}: Args): GuestPromotionQualification | null {
  if (result !== 'win' || !playSettings) return null;

  if (danSeedRequirement) {
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
