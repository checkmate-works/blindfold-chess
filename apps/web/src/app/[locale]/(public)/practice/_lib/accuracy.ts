/**
 * Shared accuracy calculation utilities for position-based practice modules
 */
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';

import type { PositionAccuracy, ScoreDetail, SquareDiff } from './types';

/**
 * Convert square index to algebraic notation
 */
function indexToSquare(index: number): string {
  const file = String.fromCharCode(97 + (index % 8)); // a-h
  const rank = 8 - Math.floor(index / 8); // 8-1
  return file + rank;
}

/**
 * Get piece description from piece names mapping
 */
function getPieceDescription(piece: string, pieceNames: Record<string, string>): string {
  return pieceNames[piece] || piece;
}

/**
 * Calculate accuracy between original and recreated positions
 */
export function calculateAccuracy(
  originalFen: string,
  recreatedFen: string,
  pieceNames: Record<string, string>,
  descriptions: {
    correct: (piece: string, square: string) => string;
    wrongPiece: (square: string, expected: string, actual: string) => string;
    missing: (piece: string, square: string) => string;
    extra: (piece: string, square: string) => string;
  }
): PositionAccuracy {
  const originalBoard = fenToBoardFlat(originalFen);
  const recreatedBoard = fenToBoardFlat(recreatedFen);

  let correctPieces = 0;
  let totalPieces = 0;
  let incorrectPieces = 0; // incorrect: a piece from the original position, but placed with a different piece type
  let missingPieces = 0; // missing: a piece that should be placed but is omitted
  let extraPieces = 0; // extra: a piece placed on a square that should remain empty
  const details: ScoreDetail[] = [];

  for (let i = 0; i < 64; i++) {
    const originalPiece = originalBoard[i];
    const recreatedPiece = recreatedBoard[i];
    const square = indexToSquare(i);

    if (originalPiece !== '' && recreatedPiece !== '') {
      // Both squares have pieces
      totalPieces++;
      if (originalPiece === recreatedPiece) {
        // Correct piece
        correctPieces++;
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: 1,
          description: descriptions.correct(getPieceDescription(originalPiece, pieceNames), square),
        });
      } else {
        // Wrong piece (incorrect)
        incorrectPieces++;
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: -0.5,
          description: descriptions.wrongPiece(
            square,
            getPieceDescription(originalPiece, pieceNames),
            getPieceDescription(recreatedPiece, pieceNames)
          ),
        });
      }
    } else if (originalPiece !== '' && recreatedPiece === '') {
      // Missing piece
      totalPieces++;
      missingPieces++;
      details.push({
        square,
        expected: originalPiece,
        actual: '',
        score: 0,
        description: descriptions.missing(getPieceDescription(originalPiece, pieceNames), square),
      });
    } else if (originalPiece === '' && recreatedPiece !== '') {
      // Extra piece (shouldn't be there)
      extraPieces++;
      details.push({
        square,
        expected: '',
        actual: recreatedPiece,
        score: -0.5,
        description: descriptions.extra(getPieceDescription(recreatedPiece, pieceNames), square),
      });
    }
    // If both are empty, no action needed
  }

  const netScore = correctPieces - (incorrectPieces + extraPieces) * 0.5;
  const accuracy = totalPieces > 0 ? Math.max(0, (netScore / totalPieces) * 100) : 0;

  return {
    correctPieces,
    totalPieces,
    incorrectPieces,
    missingPieces,
    extraPieces,
    netScore,
    accuracy,
    details,
  };
}

/**
 * Calculate square differences between original and recreated positions
 * for visual overlay display
 */
export function calculateSquareDifferences(
  originalFen: string,
  recreatedFen: string
): SquareDiff[] {
  const originalBoard = fenToBoardFlat(originalFen);
  const recreatedBoard = fenToBoardFlat(recreatedFen);

  const differences: SquareDiff[] = [];

  for (let i = 0; i < 64; i++) {
    const originalPiece = originalBoard[i];
    const recreatedPiece = recreatedBoard[i];
    const square = indexToSquare(i);

    if (originalPiece !== '' && recreatedPiece !== '') {
      // Both squares have pieces
      if (originalPiece === recreatedPiece) {
        // Correct piece
        differences.push({ square, status: 'correct' });
      } else {
        // Wrong piece
        differences.push({ square, status: 'incorrect' });
      }
    } else if (originalPiece !== '' && recreatedPiece === '') {
      // Missing piece (should be here but isn't)
      differences.push({ square, status: 'missing' });
    } else if (originalPiece === '' && recreatedPiece !== '') {
      // Extra piece (shouldn't be here but is)
      differences.push({ square, status: 'incorrect' });
    }
    // If both are empty, no overlay needed
  }

  return differences;
}
