/**
 * Naming note: this feature is "Kata" (型) to users and "repertoire" in code —
 * identifiers, files, i18n keys, URLs, DB all speak repertoire; only i18n
 * message VALUES say Kata. See "Kata / Repertoire (型)" in apps/web/CLAUDE.md.
 */
import type { GameForMatch, LineMatchResult, Side } from '@blindfold-chess/features/chess-core';

import type { Repertoire } from '@/lib/db';

import { isRepertoireApplicableFromFirstMove, matchGameToRepertoire } from './match';
import { listRepertoiresWithLinesForSide } from './queries';

export type RepertoireCheckEntry = {
  repertoire: Repertoire;
  result: LineMatchResult;
};

export type RepertoireCheckReport = {
  /** Whether the user has ANY live repertoire for the side they played. */
  hasRepertoiresForSide: boolean;
  /**
   * One entry per repertoire that applies to the game from its very first
   * move (see {@link isRepertoireApplicableFromFirstMove}), deepest match first. A
   * repertoire whose first prepared move the game never played is omitted —
   * "no repertoires for the side" and "had repertoires, none applicable" are
   * distinguished via {@link hasRepertoiresForSide} vs an empty `entries`.
   */
  entries: RepertoireCheckEntry[];
};

const STATUS_ORDER = { 'in-book': 0, deviation: 1, gap: 2, 'not-applicable': 3 } as const;

/**
 * The kata check for one finished game: match it against every repertoire the
 * user OWNS for the colour they played (never another user's, public or not —
 * see {@link listRepertoiresWithLinesForSide}), and report — per repertoire —
 * whether the opening stayed on kata, deviated, or ran into an unprepared
 * opponent move. Repertoires whose root position the game never reached, or
 * whose very first prepared move the game didn't play, are omitted (they say
 * nothing useful about this game).
 */
export async function getRepertoireCheckReport(args: {
  userId: string;
  moves: string[];
  playerColor: Side;
  startingFen?: string;
}): Promise<RepertoireCheckReport> {
  const repertoiresWithLines = await listRepertoiresWithLinesForSide(args.userId, args.playerColor);

  const game: GameForMatch = {
    moves: args.moves,
    playerColor: args.playerColor,
    startingFen: args.startingFen,
  };

  const entries = repertoiresWithLines
    .flatMap(({ repertoire, lines }) => {
      const result = matchGameToRepertoire(
        game,
        lines.map((line) => line.pgn)
      );
      if (!result || !isRepertoireApplicableFromFirstMove(result)) return [];
      return [{ repertoire, result }];
    })
    .sort(
      (a, b) =>
        b.result.followedPlies - a.result.followedPlies ||
        STATUS_ORDER[a.result.status] - STATUS_ORDER[b.result.status]
    );

  return { hasRepertoiresForSide: repertoiresWithLines.length > 0, entries };
}
