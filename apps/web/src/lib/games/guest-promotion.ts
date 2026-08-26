import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { RankSlug } from '@/lib/db/data/ranks';
import { isGamePublishWinHiddenBoardRequirement, ranksSeedData } from '@/lib/db/data/ranks';

import { qualifiesAsHiddenBoardWin } from './hidden-board-win';
import { isConstrainedPlaySettings } from './play-settings-constraint';
import { normalizePlaySettingsLog } from './play-settings-log';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
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

/**
 * Everything a finished game contributes to a rank-requirement verdict.
 *
 * Named because three call sites carry it: this classifier and the two
 * finish-modal hooks that feed it. The hooks used to redeclare all eight
 * fields under their own names and rename them on the way in, so a field
 * added here reached neither until both copies were updated by hand.
 */
export type FinishedGameEvidence = {
  /** The player's terminal result. Only a win can qualify. */
  result: FinalGameOutcome | null;
  /**
   * The START-OF-GAME settings snapshot — what publish persists to
   * `games.play_settings` and what the server evaluator grades.
   */
  playSettings: GamePlaySettings | null | undefined;
  /** The mid-game preference change log (`Game.preferenceChangeLog`). */
  changeLog: readonly PreferenceChangeLogEntry[] | null | undefined;
  /**
   * Per-move aid counts (`Game.operationLogs`). Only the fallback source of
   * the peek total: undo deletes log entries along with the peeks they
   * recorded, so it is read only when {@link operationTotals} is absent.
   */
  operationLogs: readonly MoveOperationLog[] | null | undefined;
  /**
   * The monotonic lifetime counters (`Game.operationTotals`) — the peek total
   * the 1dan bar is graded on, because undo cannot shrink them. Absent on
   * games recorded before the ledger existed, which fall back to
   * {@link operationLogs}; see {@link qualifiesAsHiddenBoardWin}.
   */
  operationTotals: OperationTotals | null | undefined;
  /** Half-moves played — bounds the change-log normalization. */
  moveCount: number;
  /**
   * The position the game started from (`Game.startingFen`); absent means
   * the standard start. Together with `setupPlies` this feeds the 1dan bar's
   * "played from move 1" test.
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
 * row (`rank-evaluation.ts`). Keeping the two in step is not a matter of
 * writing the same checks twice: the whole 1dan bar is delegated to
 * `qualifiesAsHiddenBoardWin`, the one function the evaluator also calls,
 * and the peek allowance it is given comes from the 1dan seed requirement
 * rather than a number repeated here. `isConstrainedPlaySettings` (the 1kyu
 * bar) is likewise the evaluator's own predicate.
 *
 * What this function still owns is translating a game that is not published
 * yet into what the evaluator will see once it is: the change log is run
 * through `normalizePlaySettingsLog`, the exact transformation publish
 * applies before storing `games.play_settings_log`.
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
  operationTotals,
  moveCount,
  startingFen,
  setupPlies,
}: FinishedGameEvidence): GuestPromotionQualification | null {
  if (result !== 'win' || !playSettings) return null;

  if (
    danSeedRequirement &&
    qualifiesAsHiddenBoardWin(
      {
        playSettings,
        playSettingsLog: normalizePlaySettingsLog(changeLog ?? null, moveCount),
        operationLogs,
        operationTotals,
        startingFen,
        setupPlies,
      },
      danSeedRequirement.maxPeeks
    )
  ) {
    return '1dan';
  }

  if (isConstrainedPlaySettings(playSettings)) return '1kyu';

  return null;
}
