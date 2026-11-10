import type { Locale } from "@blindfold-chess/types";

import { isBlackToMoveFromFen } from "../chess-core/fen-pure";

/**
 * A FEN plus whose turn it is — the unit a FEN reconstruction session works
 * through. `isBlackToMove` decides the board's initial orientation, so the
 * player recreates the position from the side that is about to move.
 */
export type FenPosition = {
  fen: string;
  isBlackToMove: boolean;
};

/**
 * One built-in FEN reconstruction problem.
 *
 * The display name is stored as an English `name` and a Japanese `nameJa`
 * rather than as an i18n key: the problem set is data shared by both apps,
 * whose message dictionaries use different key schemas, so a key would have
 * to be added twice and kept in step. Other locales fall back to `name`
 * (see {@link getPositionName}).
 */
export type FenProblem = {
  /** Stable identifier, used as a list key and for the preview selection. */
  id: string;
  fen: string;
  name: string;
  nameJa: string;
};

/** A built-in problem as the setup screen lists it: id, FEN and a title. */
export type PresetPosition = {
  id: string;
  fen: string;
  title: string;
};

/** The built-in problem set, ordered from simple to complex. */
export const FEN_PROBLEMS: readonly FenProblem[] = [
  {
    id: "starting",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    name: "Starting Position",
    nameJa: "初期配置",
  },
  {
    id: "minimal",
    fen: "4k3/8/8/8/8/8/4p3/K7 w - - 0 1",
    name: "Minimal Position",
    nameJa: "最小構成",
  },
  {
    id: "few-pieces",
    fen: "8/3R4/8/8/2k2Q2/P7/8/7K b - - 4 49",
    name: "Few Pieces",
    nameJa: "少数駒",
  },
  {
    id: "medium",
    fen: "1R6/P4ppk/4p2p/3pP3/1P6/5P1P/2r2r2/R4K2 w - - 6 36",
    name: "Medium Complexity",
    nameJa: "中程度の複雑さ",
  },
  {
    id: "complex",
    fen: "r1bqk1nr/ppp1bppp/2n5/1P2P3/2Pp4/P4N2/3BPPPP/RN1QKB1R b KQkq - 0 8",
    name: "Higher Complexity",
    nameJa: "高難易度",
  },
];

/**
 * The built-in problems in the `{ id, fen, title }` shape the web setup
 * screen lists. `title` is the English name on every locale, which is what
 * the web has always shown there.
 */
export const PRESET_POSITIONS: readonly PresetPosition[] = FEN_PROBLEMS.map(
  ({ id, fen, name }) => ({ id, fen, title: name }),
);

/** Number of built-in problems; the default problem count of a session. */
export const PRESET_POSITION_COUNT = FEN_PROBLEMS.length;

/**
 * The problem's display name for `locale`: the Japanese name on `ja` when
 * one is present, the English name everywhere else.
 */
export function getPositionName(
  problem: Pick<FenProblem, "name" | "nameJa">,
  locale: Locale | string,
): string {
  if (locale === "ja" && problem.nameJa) return problem.nameJa;
  return problem.name;
}

/** The built-in problems as session positions, names included. */
export function getFenPositions(): (FenPosition &
  Pick<FenProblem, "name" | "nameJa">)[] {
  return FEN_PROBLEMS.map((problem) => ({
    fen: problem.fen,
    isBlackToMove: isBlackToMoveFromFen(problem.fen),
    name: problem.name,
    nameJa: problem.nameJa,
  }));
}
