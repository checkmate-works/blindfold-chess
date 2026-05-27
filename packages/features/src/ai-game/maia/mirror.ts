/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — vertical-mirror utilities. Maia 3 always evaluates a
 * position from white's perspective, so black-to-move positions and their
 * resulting moves must be mirrored top-to-bottom (and piece colours
 * swapped on the FEN side).
 *
 * Reference implementation: CSSLab/maia-platform-frontend (GPL-3.0),
 * `src/lib/engine/tensor.ts`.
 */

/**
 * Mirror a square in algebraic notation along the horizontal axis.
 * The file stays put, the rank inverts (1↔8, 2↔7, ...). The square
 * argument is assumed valid — passing an invalid two-character string
 * yields garbage rather than throwing, mirroring the upstream behaviour.
 */
export function mirrorSquare(square: string): string {
  const file = square.charAt(0);
  const rank = (9 - parseInt(square.charAt(1), 10)).toString();
  return file + rank;
}

/**
 * Mirror a UCI move (`<from><to>[<promotion>]`) along the horizontal
 * axis. Promotion piece letter is preserved verbatim.
 */
export function mirrorUciMove(uciMove: string): string {
  const isPromotion = uciMove.length > 4;
  const start = uciMove.substring(0, 2);
  const end = uciMove.substring(2, 4);
  const promotion = isPromotion ? uciMove.substring(4) : "";
  return mirrorSquare(start) + mirrorSquare(end) + promotion;
}

/**
 * Swap piece colours within a single FEN rank — uppercase ↔ lowercase,
 * digits (empty-square runs) unchanged.
 */
function swapColoursInRank(rank: string): string {
  let out = "";
  for (const ch of rank) {
    if (/[A-Z]/.test(ch)) {
      out += ch.toLowerCase();
    } else if (/[a-z]/.test(ch)) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Swap castling-rights letters so that the resulting FEN is consistent
 * with the colour-swapped board. K↔k, Q↔q. Output is emitted in canonical
 * order (KQkq), and `-` round-trips to `-`.
 */
function swapCastlingRights(castling: string): string {
  if (castling === "-") return "-";

  const rights = new Set(castling.split(""));
  const swapped = new Set<string>();
  if (rights.has("K")) swapped.add("k");
  if (rights.has("Q")) swapped.add("q");
  if (rights.has("k")) swapped.add("K");
  if (rights.has("q")) swapped.add("Q");

  let out = "";
  if (swapped.has("K")) out += "K";
  if (swapped.has("Q")) out += "Q";
  if (swapped.has("k")) out += "k";
  if (swapped.has("q")) out += "q";
  return out === "" ? "-" : out;
}

/**
 * Vertically mirror a full FEN string: ranks reversed, piece colours
 * swapped, active colour swapped, castling rights swapped, en-passant
 * square mirrored. Halfmove and fullmove counters pass through.
 */
export function mirrorFen(fen: string): string {
  const parts = fen.split(" ");
  if (parts.length < 6) {
    throw new Error(
      `mirrorFen: FEN must have 6 space-separated fields, got: ${fen}`,
    );
  }
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    parts;

  const mirroredPosition = position
    .split("/")
    .slice()
    .reverse()
    .map(swapColoursInRank)
    .join("/");

  const mirroredActiveColor = activeColor === "w" ? "b" : "w";
  const mirroredCastling = swapCastlingRights(castling);
  const mirroredEnPassant = enPassant !== "-" ? mirrorSquare(enPassant) : "-";

  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`;
}
