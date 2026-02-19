import { Chess, Square } from "chess.js";

import { FILES, RANKS } from "../common";

import { pieceSymbolMap } from "./constants";
import type { MoveQuestion, PieceType } from "./types";

// Check if a move is legal for a given piece
export function isLegalMove(
  from: string,
  to: string,
  pieceType: PieceType,
): boolean {
  // Create a chess instance with only the specified piece
  const chess = new Chess();
  chess.clear();

  // Place a white piece at the from square
  const pieceSymbol = pieceSymbolMap[pieceType];
  chess.put({ type: pieceSymbol, color: "w" }, from as Square);

  // Try to make the move
  try {
    const move = chess.move({ from: from as Square, to: to as Square });
    return move !== null;
  } catch {
    return false;
  }
}

// Get a mix of legal and illegal moves for better distribution
export function generateBalancedMoveQuestions(
  count: number,
  allowedPieces: PieceType[] = ["bishop", "knight", "rook", "queen", "king"],
): MoveQuestion[] {
  const questions: MoveQuestion[] = [];
  const targetLegalCount = Math.floor(count * 0.5); // Aim for 50% legal moves
  let legalCount = 0;

  while (questions.length < count) {
    const piece =
      allowedPieces[Math.floor(Math.random() * allowedPieces.length)];
    const question = generateMoveQuestionForPiece(
      piece,
      legalCount < targetLegalCount,
    );

    if (question) {
      questions.push(question);
      if (isLegalMove(question.from, question.to, question.piece)) {
        legalCount++;
      }
    }
  }

  // Shuffle the questions
  return questions.sort(() => Math.random() - 0.5);
}

// Generate a move question for a specific piece type
export function generateMoveQuestionForPiece(
  pieceType: PieceType,
  preferLegal: boolean,
): MoveQuestion | null {
  // Try multiple times to generate a suitable question
  for (let attempts = 0; attempts < 50; attempts++) {
    const fromFile = Math.floor(Math.random() * 8);
    const fromRank = Math.floor(Math.random() * 8);
    const fromSquare = FILES[fromFile] + RANKS[fromRank];

    let toFile: number;
    let toRank: number;
    let toSquare: string;

    if (preferLegal) {
      // Generate likely legal moves based on piece type
      switch (pieceType) {
        case "bishop": {
          // Diagonal moves
          const diagonalOffset = Math.floor(Math.random() * 7) + 1;
          const direction = Math.floor(Math.random() * 4);
          if (direction === 0) {
            // up-right
            toFile = fromFile + diagonalOffset;
            toRank = fromRank + diagonalOffset;
          } else if (direction === 1) {
            // up-left
            toFile = fromFile - diagonalOffset;
            toRank = fromRank + diagonalOffset;
          } else if (direction === 2) {
            // down-right
            toFile = fromFile + diagonalOffset;
            toRank = fromRank - diagonalOffset;
          } else {
            // down-left
            toFile = fromFile - diagonalOffset;
            toRank = fromRank - diagonalOffset;
          }
          break;
        }

        case "rook":
          // Straight moves
          if (Math.random() < 0.5) {
            // Horizontal
            toFile = Math.floor(Math.random() * 8);
            toRank = fromRank;
          } else {
            // Vertical
            toFile = fromFile;
            toRank = Math.floor(Math.random() * 8);
          }
          break;

        case "knight": {
          // L-shaped moves
          const knightMoves = [
            [2, 1],
            [2, -1],
            [-2, 1],
            [-2, -1],
            [1, 2],
            [1, -2],
            [-1, 2],
            [-1, -2],
          ];
          const knightMove =
            knightMoves[Math.floor(Math.random() * knightMoves.length)];
          toFile = fromFile + knightMove[0];
          toRank = fromRank + knightMove[1];
          break;
        }

        case "queen": {
          // Any direction
          if (Math.random() < 0.5) {
            // Like bishop
            const queenDiagonalOffset = Math.floor(Math.random() * 7) + 1;
            const queenDirection = Math.floor(Math.random() * 4);
            if (queenDirection === 0) {
              toFile = fromFile + queenDiagonalOffset;
              toRank = fromRank + queenDiagonalOffset;
            } else if (queenDirection === 1) {
              toFile = fromFile - queenDiagonalOffset;
              toRank = fromRank + queenDiagonalOffset;
            } else if (queenDirection === 2) {
              toFile = fromFile + queenDiagonalOffset;
              toRank = fromRank - queenDiagonalOffset;
            } else {
              toFile = fromFile - queenDiagonalOffset;
              toRank = fromRank - queenDiagonalOffset;
            }
          } else {
            // Like rook
            if (Math.random() < 0.5) {
              toFile = Math.floor(Math.random() * 8);
              toRank = fromRank;
            } else {
              toFile = fromFile;
              toRank = Math.floor(Math.random() * 8);
            }
          }
          break;
        }

        case "king": {
          // One square in any direction
          const kingMoves = [
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
          ];
          const kingMove =
            kingMoves[Math.floor(Math.random() * kingMoves.length)];
          toFile = fromFile + kingMove[0];
          toRank = fromRank + kingMove[1];
          break;
        }
      }
    } else {
      // Generate random moves (likely illegal)
      toFile = Math.floor(Math.random() * 8);
      toRank = Math.floor(Math.random() * 8);
    }

    // Check if destination is valid
    if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
      toSquare = FILES[toFile] + RANKS[toRank];

      // Ensure from and to are different
      if (toSquare !== fromSquare) {
        const isLegal = isLegalMove(fromSquare, toSquare, pieceType);

        // Return if we got what we wanted
        if ((preferLegal && isLegal) || (!preferLegal && !isLegal)) {
          return {
            from: fromSquare,
            to: toSquare,
            piece: pieceType,
          };
        }
      }
    }
  }

  // Fallback: return any valid question
  const fromFile = Math.floor(Math.random() * 8);
  const fromRank = Math.floor(Math.random() * 8);
  const fromSquare = FILES[fromFile] + RANKS[fromRank];

  let toFile = Math.floor(Math.random() * 8);
  let toRank = Math.floor(Math.random() * 8);
  let toSquare = FILES[toFile] + RANKS[toRank];

  while (toSquare === fromSquare) {
    toFile = Math.floor(Math.random() * 8);
    toRank = Math.floor(Math.random() * 8);
    toSquare = FILES[toFile] + RANKS[toRank];
  }

  return {
    from: fromSquare,
    to: toSquare,
    piece: pieceType,
  };
}
