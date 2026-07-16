import type { GameForMatch, LineMatchResult, Side } from '@blindfold-chess/features/chess-core';

import type { Repertoire } from '@/lib/db';

import { matchGameToKata } from './kata-match';
import { listRepertoiresWithLinesForSide } from './queries';

export type KataEntry = {
  repertoire: Repertoire;
  result: LineMatchResult;
};

export type KataReport = {
  /** Whether the user has ANY live repertoire for the side they played. */
  hasRepertoiresForSide: boolean;
  /** One entry per repertoire the game actually entered, deepest match first. */
  entries: KataEntry[];
};

const STATUS_ORDER = { 'in-book': 0, deviation: 1, gap: 2, 'not-applicable': 3 } as const;

/**
 * The kata check for one finished game: match it against every repertoire the
 * user registered for the colour they played, and report — per repertoire —
 * whether the opening stayed on kata, deviated, or ran into an unprepared
 * opponent move. Repertoires whose root position the game never reached are
 * omitted (they say nothing about this game).
 */
export async function getKataReport(args: {
  userId: string;
  moves: string[];
  playerColor: Side;
  startingFen?: string;
}): Promise<KataReport> {
  const repertoiresWithLines = await listRepertoiresWithLinesForSide(args.userId, args.playerColor);

  const game: GameForMatch = {
    moves: args.moves,
    playerColor: args.playerColor,
    startingFen: args.startingFen,
  };

  const entries = repertoiresWithLines
    .flatMap(({ repertoire, lines }) => {
      const result = matchGameToKata(
        game,
        lines.map((line) => line.pgn)
      );
      return result ? [{ repertoire, result }] : [];
    })
    .sort(
      (a, b) =>
        b.result.followedPlies - a.result.followedPlies ||
        STATUS_ORDER[a.result.status] - STATUS_ORDER[b.result.status]
    );

  return { hasRepertoiresForSide: repertoiresWithLines.length > 0, entries };
}
