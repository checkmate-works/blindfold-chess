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
  deleteFenTitle?: string;
  deleteFenMessage?: string;
  deleteFenConfirm?: string;
  deleteFenCancel?: string;
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
