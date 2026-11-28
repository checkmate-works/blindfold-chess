import { validateFenFormat } from '@blindfold-chess/features/chess-core/fen';

/**
 * Read the `problems` query parameter of `/practice/fen/session`: a Base64
 * string of FENs, one per line.
 *
 * `FenSetup` validates the list before it builds the URL, but the URL can be
 * typed, edited or shared, and the session shows whatever it is given as a
 * problem — a line that is not a FEN would be asked as one, and no
 * recreation could ever match it. So every line is checked again here, with
 * the same `validateFenFormat` the setup screen uses. Lines that fail are
 * dropped; a list left empty, or one that does not decode, comes back null,
 * and the session falls back to the built-in problems. The app's
 * `parseFenSessionParams` (apps/mobile) treats its deep links the same way.
 */
export function parseSessionFens(problems: unknown): string[] | null {
  if (typeof problems !== 'string' || problems === '') return null;

  let decoded: string;
  try {
    decoded = atob(problems);
  } catch {
    return null;
  }

  const fens = decoded
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && validateFenFormat(line));
  return fens.length > 0 ? fens : null;
}

/**
 * Read the `fen` query parameter of `/practice/fen/session`, the single
 * position the tutorial starts with. It reaches the session as a problem in
 * the same way the `problems` list does, so it is checked the same way;
 * anything that is not a FEN comes back null and the session plays the
 * built-in problems instead.
 */
export function parseTutorialFen(fen: unknown): string | null {
  if (typeof fen !== 'string' || fen === '') return null;

  let decoded: string;
  try {
    // `FenTutorial` encodes the FEN before URLSearchParams encodes it again,
    // so one layer of percent-encoding is still on the value here.
    decoded = decodeURIComponent(fen);
  } catch {
    return null;
  }

  return validateFenFormat(decoded) ? decoded : null;
}
