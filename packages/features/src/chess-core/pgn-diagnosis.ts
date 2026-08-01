/**
 * pgn-diagnosis: *why* a PGN is unusable, in a form a UI can translate.
 *
 * The app has three PGN validators that disagree about what they accept
 * (`parsePgnTree` for repertoire trees, `validatePgn*` — chess.js `loadPgn` —
 * for game import, `validateAttachedPgn` for post attachments). Unifying what
 * they *accept* would silently change which PGNs get through each surface, so
 * this module unifies the other half instead: every surface reports its
 * failures in one vocabulary, and the best available one — an offending move
 * located by fullmove number and ply, the way Lichess reports it.
 *
 * Diagnosis is deliberately separate from validation. The caller decides
 * whether a PGN is acceptable (its existing gate, unchanged); this only
 * explains a rejection. That keeps the improvement free of behaviour change.
 *
 * No i18n here by design — `packages/features` is consumed by web and mobile
 * and knows nothing about next-intl. This returns a locale-free description;
 * mapping it onto message keys is the app's job.
 */
import { PgnParseError, parsePgnTree } from "./pgn-tree";

/**
 * What is wrong with a PGN.
 *
 * `illegalMove` is the case worth having: it names the move AND where it sits,
 * which is what makes a 40-move paste fixable. `illegalMoveUnlocated` is the
 * degraded form for when only the move name could be recovered (a chess.js
 * rejection this module could not reproduce), and `unreadable` is the floor.
 */
export type PgnDiagnosis =
  | { code: "illegalMove"; san: string; moveNumber: number; ply: number }
  | { code: "illegalMoveUnlocated"; san: string }
  | { code: "noMoves" }
  | { code: "unreadable" };

/**
 * Guard on tokens this module quotes back to the user.
 *
 * The token is lifted out of text someone pasted, and the diagnosis is
 * displayed — on the post-attachment surface, to *other* readers of that
 * thread. React escapes markup, so this is not an injection defence; it is a
 * "a validation message should not echo an arbitrary slice of your paste" one.
 *
 * The rule is deliberately "short and word-shaped", not "valid SAN": the whole
 * reason a token is being reported is that it was rejected, so requiring it to
 * be well-formed would silence the very cases worth naming (`Qz9`, `e9`). It
 * admits letters, digits and the punctuation real SAN uses (`=` `+` `#` `-`
 * `:` `.` for promotion, check, castling, `e.p.`), and caps at 12 characters —
 * comfortably past the longest real SAN (`Qh4xe1=Q#`, 9).
 */
const QUOTABLE_TOKEN = /^[A-Za-z0-9=+#:.-]{1,12}$/;

function quotableSan(san: string): string | null {
  return QUOTABLE_TOKEN.test(san) ? san : null;
}

/**
 * Diagnose a PGN by parsing it, or `null` if it parses cleanly.
 *
 * Blank input is `null` too: an untouched textbox is a form not yet filled in,
 * which the required-field check owns — not a mistake to report.
 *
 * Note this answers for `parsePgnTree`'s notion of valid. A caller whose gate
 * is chess.js should use it only for the message, and fall back to
 * {@link diagnoseChessJsPgnError} when this returns `null` for text its own
 * validator rejected.
 */
export function diagnosePgn(pgn: string): PgnDiagnosis | null {
  if (!pgn.trim()) return null;

  try {
    parsePgnTree(pgn);
    return null;
  } catch (error) {
    if (!(error instanceof PgnParseError)) return { code: "unreadable" };

    const { failure } = error;
    if (failure.reason === "noMoves") return { code: "noMoves" };
    if (failure.reason !== "illegalMove") return { code: "unreadable" };

    const san = quotableSan(failure.san);
    if (!san) return { code: "unreadable" };
    return {
      code: "illegalMove",
      san,
      moveNumber: failure.moveNumber,
      ply: failure.ply,
    };
  }
}

/**
 * Recover what little a chess.js `loadPgn` rejection says, for surfaces that
 * keep chess.js as their gate and hit a PGN {@link diagnosePgn} accepts (the
 * two parsers do not agree in every corner).
 *
 * chess.js states the offending move but never its position, so the best this
 * can return is `illegalMoveUnlocated`. It lives here — not in the app —
 * because recognising chess.js' error wording is chess.js knowledge, and this
 * package is where that dependency is isolated (see the chess.js isolation
 * rule in CLAUDE.md). If chess.js changes its messages, this file changes.
 */
export function diagnoseChessJsPgnError(message: string): PgnDiagnosis {
  // "Invalid move in PGN: xyz" (chess.js's own validation)
  const moveError = message.match(/Invalid move in PGN: (.+)/);
  // 'Expected ... but "X" found.' (the generated PGN grammar parser)
  const parserError = message.match(/but "(.+)" found/);
  const raw = (moveError?.[1] ?? parserError?.[1])?.trim();
  const san = raw ? quotableSan(raw) : null;

  return san ? { code: "illegalMoveUnlocated", san } : { code: "unreadable" };
}
