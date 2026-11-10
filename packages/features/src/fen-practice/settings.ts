import { validateFenFormat } from "../chess-core/fen-pure";
import { PRESET_POSITION_COUNT } from "./problems";

/** Most FENs a custom problem list may hold. */
export const MAX_FEN_COUNT = 10;

/**
 * The FEN reconstruction setup a player keeps between visits. Each app
 * persists it under its own storage key; the shape and defaults are shared so
 * both read a stored object the same way.
 */
export type FenSettings = {
  problemCount: number;
  shuffleProblems: boolean;
  /** Play the player's own FEN list instead of the built-in problems. */
  useCustomFen: boolean;
  /** The custom FEN list, one FEN per line. */
  customFenInput: string;
};

export const DEFAULT_FEN_SETTINGS: FenSettings = {
  problemCount: PRESET_POSITION_COUNT,
  shuffleProblems: true,
  useCustomFen: false,
  customFenInput: "",
};

/** The non-blank lines of a custom FEN list, trimmed. */
export function parseCustomFenLines(input: string): string[] {
  return input
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Why a custom FEN list cannot start a session. `lines` are 1-based line
 * numbers counted over the non-blank lines, which is how the error message
 * reports them.
 */
export type CustomFenError =
  { kind: "tooMany"; max: number } | { kind: "invalidLines"; lines: number[] };

/**
 * Check a custom FEN list: at most {@link MAX_FEN_COUNT} entries, each a
 * well-formed FEN. Returns null when the list is acceptable or empty — an
 * empty list is not an error to show, the start button is simply disabled.
 */
export function validateCustomFenInput(input: string): CustomFenError | null {
  const lines = parseCustomFenLines(input);
  if (lines.length === 0) return null;
  if (lines.length > MAX_FEN_COUNT) {
    return { kind: "tooMany", max: MAX_FEN_COUNT };
  }

  const invalidLines: number[] = [];
  lines.forEach((line, index) => {
    if (!validateFenFormat(line)) invalidLines.push(index + 1);
  });

  return invalidLines.length > 0
    ? { kind: "invalidLines", lines: invalidLines }
    : null;
}
