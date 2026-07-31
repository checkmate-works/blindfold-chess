/**
 * FEN helpers that do NOT depend on `chess.js`.
 *
 * The chess.js-dependent counterparts live in `./fen-chess.ts`. Both files are
 * re-exported from `./fen.ts` so the chess-core barrel (`./index.ts`) stays
 * byte-for-byte compatible with existing callers.
 *
 * Consumers that import from `@blindfold-chess/features/chess-core/fen` (the
 * subpath export wired via the package's `exports` field) receive ONLY this
 * file's contents, so they never pull `chess.js` into their bundle.
 *
 * If you add a new pure FEN helper, put it here. If you add a helper that
 * needs chess.js, put it in `fen-chess.ts` — do NOT import `chess.js` into
 * this file.
 */

/**
 * Parse FEN piece placement into a flat 64-element array of piece characters.
 * Index 0 = a8, index 1 = b8, ..., index 63 = h1.
 * Empty squares are represented as empty strings.
 * Only the piece placement part of the FEN is used (before the first space).
 */
export function fenToBoardFlat(fen: string): string[] {
  const piecePlacement = fen.split(" ")[0];
  const board: string[] = new Array(64).fill("");
  let squareIndex = 0;

  for (const char of piecePlacement) {
    if (char === "/") {
      continue;
    } else if (/\d/.test(char)) {
      squareIndex += parseInt(char);
    } else {
      board[squareIndex] = char;
      squareIndex++;
    }
  }

  return board;
}

/**
 * Serialize a flat 64-element board (as produced by {@link fenToBoardFlat})
 * back into a FEN string.
 *
 * Index 0 = a8, index 63 = h1. Empty squares are represented by empty strings.
 *
 * By default, the returned FEN uses the neutral game-state suffix
 * `" w - - 0 1"`. If `options.preserveFrom` is provided and it is a full
 * six-field FEN, the side-to-move, castling, en passant, halfmove and fullmove
 * fields are copied from that FEN instead (useful for preserving turn info
 * while the piece placement is edited).
 */
export function boardFlatToFen(
  board: readonly string[],
  options: { preserveFrom?: string } = {},
): string {
  let placement = "";

  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    let rankFen = "";

    for (let file = 0; file < 8; file++) {
      const squareIndex = rank * 8 + file;
      const piece = board[squareIndex];

      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankFen += emptyCount;
          emptyCount = 0;
        }
        rankFen += piece;
      }
    }

    if (emptyCount > 0) {
      rankFen += emptyCount;
    }

    placement += rankFen;
    if (rank < 7) {
      placement += "/";
    }
  }

  if (options.preserveFrom) {
    const parts = options.preserveFrom.split(" ");
    if (parts.length >= 6) {
      const gameStateInfo = parts.slice(1).join(" ");
      return placement + " " + gameStateInfo;
    }
  }

  return placement + " w - - 0 1";
}

/**
 * Shallow helper: returns `true` when the side-to-move field of a FEN is
 * black. Unlike {@link getTurnFromFen}, this does not throw on malformed
 * FENs — it simply falls back to `false` so UI code can use it safely in
 * places that tolerate invalid input (e.g. board thumbnails).
 */
export function isBlackToMoveFromFen(fen: string): boolean {
  return fen.split(" ")[1] === "b";
}

/**
 * The position-identity key: the first four FEN fields (placement, side to
 * move, castling rights, en-passant square), dropping the halfmove/fullmove
 * clocks. Two FENs that differ only in their clocks denote the same position
 * for repertoire purposes, so this is the canonical key used to dedupe
 * transpositions and to key position-scoped data (reviews, annotations).
 */
export function toPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function getTurnFromFen(fen: string): "w" | "b" {
  const parts = fen.split(" ");
  if (parts.length < 6) {
    throw new Error("Invalid FEN: incomplete FEN string");
  }
  const turn = parts[1];
  if (turn !== "w" && turn !== "b") {
    throw new Error("Invalid FEN: invalid turn field");
  }
  return turn;
}

/**
 * Convert a FEN string to a Lichess analysis URL
 * @param fen - The FEN string representing the chess position
 * @returns The Lichess analysis URL compatible with both web and mobile app
 */
export function fenToLichessUrl(fen: string): string {
  // Replace spaces with underscores for URL encoding
  const encodedFen = fen.replace(/ /g, "_");
  return `https://lichess.org/analysis/${encodedFen}`;
}

/**
 * Convert a FEN string to a human-readable piece list.
 *
 * @example
 * fenToPieceList("7R/5k2/5p2/5K2/8/8/8/8 w - - 0 1")
 * // => { white: ["Kf5", "Rh8"], black: ["Kf7", "f6"] }
 *
 * Output format:
 * - King, Queen, Rook, Bishop, Knight use piece letter prefix: "Kf5", "Qd1", "Rh8", "Bc4", "Nf3"
 * - Pawns use only the square: "e4", "d5", "f6"
 * - Pieces are sorted: K, Q, R, B, N, then pawns (each group alphabetically by square)
 */
export function fenToPieceList(fen: string): {
  white: string[];
  black: string[];
} {
  const PIECE_ORDER: Record<string, number> = {
    K: 0,
    Q: 1,
    R: 2,
    B: 3,
    N: 4,
    P: 5,
  };

  const piecePlacement = fen.split(" ")[0];
  const white: string[] = [];
  const black: string[] = [];

  const ranks = piecePlacement.split("/");
  for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
    const rankNumber = 8 - rankIdx; // rank 8 at top
    let fileIdx = 0;

    for (const char of ranks[rankIdx]) {
      if (/\d/.test(char)) {
        fileIdx += parseInt(char);
      } else {
        const file = String.fromCharCode("a".charCodeAt(0) + fileIdx);
        const square = `${file}${rankNumber}`;
        const upper = char.toUpperCase();
        const label = upper === "P" ? square : `${upper}${square}`;

        if (char === char.toUpperCase()) {
          white.push(label);
        } else {
          black.push(label);
        }
        fileIdx++;
      }
    }
  }

  const sortPieces = (pieces: readonly string[]): string[] => {
    return [...pieces].sort((a, b) => {
      const pieceA = a.length === 2 ? "P" : a[0];
      const pieceB = b.length === 2 ? "P" : b[0];
      const orderA = PIECE_ORDER[pieceA] ?? 99;
      const orderB = PIECE_ORDER[pieceB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      // Within same piece type, sort alphabetically by square
      const squareA = a.length === 2 ? a : a.slice(1);
      const squareB = b.length === 2 ? b : b.slice(1);
      return squareA.localeCompare(squareB);
    });
  };

  return {
    white: sortPieces(white),
    black: sortPieces(black),
  };
}

/**
 * Lightweight FEN format validation without chess.js.
 * Checks structural validity (8 ranks, valid characters, valid turn)
 * but does not verify position legality.
 */
export function validateFenFormat(fen: string): boolean {
  const parts = fen.trim().split(" ");

  // FEN must have at least 2 parts (board and turn)
  if (parts.length < 2) return false;

  // Validate board part (8 ranks separated by /)
  const board = parts[0];
  const ranks = board.split("/");
  if (ranks.length !== 8) return false;

  // Validate each rank
  for (const rank of ranks) {
    let squareCount = 0;
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        squareCount += parseInt(char);
      } else if (/[pnbrqkPNBRQK]/.test(char)) {
        squareCount += 1;
      } else {
        return false;
      }
    }
    if (squareCount !== 8) return false;
  }

  // Validate turn
  if (parts[1] !== "w" && parts[1] !== "b") return false;

  return true;
}
