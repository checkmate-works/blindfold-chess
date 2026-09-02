// Simple score stats - for features with just correct/incorrect (coordinate-quiz, legal-moves, etc.)
export type SimpleScoreStats = {
  correct: number;
  incorrect: number;
  total: number;
};

// Detailed piece stats - for position-memory/fen with piece-level accuracy
export type DetailedPieceStats = {
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
};

// Union type for PracticeComplete
export type ScoreStats = SimpleScoreStats | DetailedPieceStats;

export function isDetailedPieceStats(stats: ScoreStats): stats is DetailedPieceStats {
  return 'missingPieces' in stats;
}

export type PracticeCompleteLabels = {
  practiceComplete: string;
  score: string;
  tryAgain: string;
  morePractice: string;
  averageTime?: string;
  recreationProgress?: string;
  correct?: string;
  incorrect?: string;
  missing?: string;
  extra?: string;
  extraDescription?: string;
  problemDetails?: string;
  problem?: string;
  original?: string;
  yourRecreation?: string;
  skipped?: string;
  analyzeOnLichess?: string;
  relatedLearning?: string;
};

export type ProblemResult = {
  fen: string;
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  originalIndex: number;
  skipped?: boolean;
};
