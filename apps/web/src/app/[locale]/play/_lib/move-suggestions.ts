import {
  ALL_FILES,
  ALL_PIECE_SYMBOLS,
  ALL_RANKS,
  AlgebraicNotation,
  File,
  Rank,
} from '@blindfold-chess/core';

/**
 * Generate move suggestions based on partial input
 * Returns empty array for complete moves to avoid unnecessary suggestions
 */
export function generateMoveSuggestions(input: string): AlgebraicNotation[] {
  if (!input) return [];

  const trimmedInput = input.trim();
  if (!trimmedInput) return [];

  // Don't suggest if input looks like a complete move
  if (isCompleteMove(trimmedInput)) return [];

  // Handle castling
  if (trimmedInput === 'O' || trimmedInput === 'O-') {
    return ['O-O', 'O-O-O'] as AlgebraicNotation[];
  }

  // Handle piece moves
  if (ALL_PIECE_SYMBOLS.some((piece) => trimmedInput.startsWith(piece))) {
    return generatePieceMoveSuggestions(trimmedInput);
  }

  // Handle pawn moves (files without piece prefix)
  if (ALL_FILES.some((file) => trimmedInput.startsWith(file))) {
    return generatePawnMoveSuggestions(trimmedInput);
  }

  return [];
}

/**
 * Check if input looks like a complete move
 */
function isCompleteMove(input: string): boolean {
  // Castling
  if (input === 'O-O' || input === 'O-O-O') return true;

  // Special case: pawn moves to promotion rank without promotion piece
  // These are incomplete and need suggestions
  if (/^[a-h][18]$/.test(input) || /^[a-h]x[a-h][18]$/.test(input)) {
    return false;
  }

  // Basic patterns that suggest complete moves
  const completePatterns = [
    /^[a-h][2-7](\+|#)?$/, // Pawn moves (not to promotion rank): e4, e4+, e4#
    /^[a-h]x[a-h][2-7](\+|#)?$/, // Pawn captures (not to promotion rank): exd5, exd5+
    /^[a-h][1-8]=[QRBN](\+|#)?$/, // Pawn promotion: e8=Q, e8=Q+
    /^[a-h]x[a-h][1-8]=[QRBN](\+|#)?$/, // Pawn capture promotion: exd8=Q
    /^[KQRBN][a-h][1-8](\+|#)?$/, // Piece moves: Nf3, Qd4+
    /^[KQRBN]x[a-h][1-8](\+|#)?$/, // Piece captures: Nxe5, Qxd4#
    /^[KQRBN][a-h][a-h][1-8](\+|#)?$/, // Disambiguated by file: Nbd2, Rad1+
    /^[KQRBN][1-8][a-h][1-8](\+|#)?$/, // Disambiguated by rank: N1d2, R1a1#
    /^[KQRBN][a-h][1-8][a-h][1-8](\+|#)?$/, // Fully disambiguated: Nb1d2
    /^[KQRBN][a-h]x[a-h][1-8](\+|#)?$/, // Disambiguated captures: Nbxd2
    /^[KQRBN][1-8]x[a-h][1-8](\+|#)?$/, // Nfxe5, R1xd1
    /^[KQRBN][a-h][1-8]x[a-h][1-8](\+|#)?$/, // Nb1xe5
  ];

  return completePatterns.some((pattern) => pattern.test(input));
}

/**
 * Generate suggestions for piece moves (K, Q, R, B, N)
 */
function generatePieceMoveSuggestions(input: string): AlgebraicNotation[] {
  const piece = input[0] as (typeof ALL_PIECE_SYMBOLS)[number];
  const rest = input.slice(1);

  // Handle captures: Bx, Bxb, Nfx, N1x, Nb1x, etc.
  if (rest.includes('x')) {
    return generatePieceCaptureSuggestions(input);
  }

  // Handle regular moves
  const suggestions: string[] = [];

  // If no disambiguation characters, suggest all squares
  if (rest === '') {
    ALL_FILES.forEach((file) => {
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${piece}${file}${rank}`);
      });
    });
  }
  // If partial disambiguation with file (e.g., "Nf", "Qd")
  else if (rest.length === 1 && ALL_FILES.includes(rest as File)) {
    const file = rest;
    ALL_RANKS.forEach((rank) => {
      suggestions.push(`${piece}${file}${rank}`);
    });
  }
  // If partial disambiguation with rank (e.g., "N1", "R8")
  else if (rest.length === 1 && ALL_RANKS.includes(parseInt(rest) as Rank)) {
    const rank = rest;
    ALL_FILES.forEach((file) => {
      suggestions.push(`${piece}${rank}${file}${rank}`);
    });
  }
  // If disambiguation + partial destination (e.g., "Nfd", "N1e")
  else if (rest.length === 2) {
    const [disambig, partialDest] = rest;
    if (ALL_FILES.includes(disambig as File) && ALL_FILES.includes(partialDest as File)) {
      // File disambiguation + destination file
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${piece}${disambig}${partialDest}${rank}`);
      });
    } else if (
      ALL_RANKS.includes(parseInt(disambig) as Rank) &&
      ALL_FILES.includes(partialDest as File)
    ) {
      // Rank disambiguation + destination file
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${piece}${disambig}${partialDest}${rank}`);
      });
    }
  }

  return suggestions as AlgebraicNotation[];
}

/**
 * Generate suggestions for piece captures
 */
function generatePieceCaptureSuggestions(input: string): AlgebraicNotation[] {
  const piece = input[0] as (typeof ALL_PIECE_SYMBOLS)[number];
  const rest = input.slice(1);
  const suggestions: string[] = [];

  // Handle cases where 'x' is not at the end (e.g., "Bxb", "Nfxe", "N1xd")
  const xIndex = rest.indexOf('x');
  if (xIndex !== -1 && xIndex < rest.length - 1) {
    const beforeX = rest.slice(0, xIndex);
    const afterX = rest.slice(xIndex + 1);

    // If there's content after 'x', generate suggestions based on that
    if (afterX.length === 1 && ALL_FILES.includes(afterX as File)) {
      // Partial destination file specified: Bxb -> Bxb1, Bxb2, ..., Bxb8
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${piece}${beforeX}x${afterX}${rank}`);
      });
    } else if (afterX.length === 2) {
      // Full destination specified: already complete, no suggestions
      return [];
    }
  } else if (rest.endsWith('x')) {
    // 'x' is at the end
    const beforeX = rest.slice(0, -1);

    if (beforeX === '') {
      // Simple captures: Bx -> Bxa1, Bxa2, ..., Bxh8
      ALL_FILES.forEach((file) => {
        ALL_RANKS.forEach((rank) => {
          suggestions.push(`${piece}x${file}${rank}`);
        });
      });
    } else if (beforeX.length === 1) {
      if (ALL_FILES.includes(beforeX as File)) {
        // File disambiguated captures: Nfx -> Nfxa1, Nfxa2, ...
        ALL_FILES.forEach((file) => {
          ALL_RANKS.forEach((rank) => {
            suggestions.push(`${piece}${beforeX}x${file}${rank}`);
          });
        });
      } else if (ALL_RANKS.includes(parseInt(beforeX) as Rank)) {
        // Rank disambiguated captures: N1x -> N1xa1, N1xa2, ...
        ALL_FILES.forEach((file) => {
          ALL_RANKS.forEach((rank) => {
            suggestions.push(`${piece}${beforeX}x${file}${rank}`);
          });
        });
      }
    } else if (beforeX.length === 2) {
      // Fully disambiguated captures: Nb1x -> Nb1xa1, Nb1xa2, ...
      ALL_FILES.forEach((file) => {
        ALL_RANKS.forEach((rank) => {
          suggestions.push(`${piece}${beforeX}x${file}${rank}`);
        });
      });
    }
  }

  return suggestions as AlgebraicNotation[];
}

/**
 * Generate suggestions for pawn moves
 */
function generatePawnMoveSuggestions(input: string): AlgebraicNotation[] {
  const suggestions: string[] = [];
  const promotionPieces = ['Q', 'R', 'B', 'N'] as const;

  // Handle pawn captures: ax, bx, etc.
  if (input.endsWith('x')) {
    const file = input[0];
    const fileIndex = ALL_FILES.indexOf(file as File);

    // Get adjacent files for captures
    const captureFiles: string[] = [];
    if (fileIndex > 0) captureFiles.push(ALL_FILES[fileIndex - 1]);
    if (fileIndex < ALL_FILES.length - 1) captureFiles.push(ALL_FILES[fileIndex + 1]);

    captureFiles.forEach((captureFile) => {
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${file}x${captureFile}${rank}`);
      });
    });
  }
  // Handle pawn captures with specific destination file: cxd, axe, etc.
  else if (input.length === 3 && input[1] === 'x' && ALL_FILES.includes(input[2] as File)) {
    const sourceFile = input[0];
    const destFile = input[2];

    // Validate that this is a valid pawn capture (adjacent files)
    const sourceIndex = ALL_FILES.indexOf(sourceFile as File);
    const destIndex = ALL_FILES.indexOf(destFile as File);

    if (Math.abs(sourceIndex - destIndex) === 1) {
      ALL_RANKS.forEach((rank) => {
        suggestions.push(`${sourceFile}x${destFile}${rank}`);
      });
    }
  }
  // Handle regular pawn moves: a -> a1, a2, ..., a8
  else if (input.length === 1 && ALL_FILES.includes(input as File)) {
    const file = input;
    ALL_RANKS.forEach((rank) => {
      suggestions.push(`${file}${rank}`);
    });
  }
  // Handle promotion suggestions for moves to 8th/1st rank
  else if (input.length === 2 && ALL_FILES.includes(input[0] as File)) {
    const file = input[0];
    const rank = input[1];

    // Check if it's a promotion rank (8 for white, 1 for black)
    if (rank === '8' || rank === '1') {
      // Generate promotion suggestions
      promotionPieces.forEach((piece) => {
        suggestions.push(`${file}${rank}=${piece}`);
      });
    }
  }
  // Handle promotion suggestions for captures to 8th/1st rank (e.g., "exd8")
  else if (
    input.length === 4 &&
    input[1] === 'x' &&
    ALL_FILES.includes(input[0] as File) &&
    ALL_FILES.includes(input[2] as File) &&
    (input[3] === '8' || input[3] === '1')
  ) {
    const sourceFile = input[0];
    const destFile = input[2];
    const rank = input[3];

    // Validate that this is a valid pawn capture (adjacent files)
    const sourceIndex = ALL_FILES.indexOf(sourceFile as File);
    const destIndex = ALL_FILES.indexOf(destFile as File);

    if (Math.abs(sourceIndex - destIndex) === 1) {
      // Generate promotion suggestions
      promotionPieces.forEach((piece) => {
        suggestions.push(`${sourceFile}x${destFile}${rank}=${piece}`);
      });
    }
  }

  return suggestions as AlgebraicNotation[];
}
