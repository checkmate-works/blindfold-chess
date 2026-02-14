import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  generateProblem,
  findShortestPath,
  validateUserPath,
} from "@blindfold-chess/features/route-planner";
import type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "../lib/types";

type UseRoutePlannerSessionProps = {
  problemCount: number;
  selectedPieces: RoutePlannerPieceType[];
  onComplete: (result: RoutePlannerResult) => void;
};

type ProblemResult = {
  success: boolean;
  shortestPath: string[];
  message: string;
};

export function useRoutePlannerSession({
  problemCount,
  selectedPieces,
  onComplete,
}: UseRoutePlannerSessionProps) {
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [problem, setProblem] = useState<RoutePlannerProblem | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [result, setResult] = useState<ProblemResult | null>(null);
  const [isShowingResult, setIsShowingResult] = useState(false);

  const resultsRef = useRef<RoutePlannerProblemResult[]>([]);

  const startSession = useCallback(() => {
    resultsRef.current = [];
    setCurrentProblemIndex(0);
    setMoves([]);
    setSelectedFile(null);
    setResult(null);
    setIsShowingResult(false);
    const newProblem = generateProblem(selectedPieces);
    setProblem(newProblem);
  }, [selectedPieces]);

  const handleFilePress = useCallback(
    (file: string) => {
      if (!problem || isShowingResult) return;
      if (selectedFile === file) {
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    },
    [problem, isShowingResult, selectedFile],
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (!problem || isShowingResult || !selectedFile) return;
      const square = `${selectedFile}${rank}`;
      setMoves((prev) => [...prev, square]);
      setSelectedFile(null);
    },
    [problem, isShowingResult, selectedFile],
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || isShowingResult) return;
    setMoves((prev) => prev.slice(0, -1));
    setSelectedFile(null);
  }, [moves.length, isShowingResult]);

  const handleSubmit = useCallback(() => {
    if (!problem) return;

    const finalMoves = [...moves];
    if (
      finalMoves.length > 0 &&
      finalMoves[finalMoves.length - 1] !== problem.end
    ) {
      finalMoves.push(problem.end);
    } else if (finalMoves.length === 0) {
      finalMoves.push(problem.end);
    }

    const validation = validateUserPath(
      problem.piece,
      problem.start,
      finalMoves,
      problem.end,
    );
    const shortestPath =
      findShortestPath(problem.piece, problem.start, problem.end) || [];

    const isSuccess = validation.valid;

    if (isSuccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setMoves(finalMoves);
    setResult({
      success: isSuccess,
      shortestPath,
      message: isSuccess ? "correct" : "incorrect",
    });
    setIsShowingResult(true);
  }, [problem, moves]);

  const handleSkip = useCallback(() => {
    if (!problem) return;
    const shortestPath =
      findShortestPath(problem.piece, problem.start, problem.end) || [];
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setResult({
      success: false,
      shortestPath,
      message: "skipped",
    });
    setIsShowingResult(true);
  }, [problem]);

  const handleNextProblem = useCallback(() => {
    if (!result || !problem) return;

    resultsRef.current.push({
      piece: problem.piece,
      start: problem.start,
      end: problem.end,
      success: result.success,
      userPath: result.message === "skipped" ? [] : moves,
      shortestPath: result.shortestPath,
      skipped: result.message === "skipped",
    });

    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < problemCount) {
      setCurrentProblemIndex(nextIndex);
      const newProblem = generateProblem(selectedPieces);
      setProblem(newProblem);
      setMoves([]);
      setSelectedFile(null);
      setResult(null);
      setIsShowingResult(false);
    } else {
      const problems = resultsRef.current;
      const correctCount = problems.filter((p) => p.success).length;
      onComplete({
        problems,
        totalProblems: problems.length,
        correctCount,
        accuracy:
          problems.length > 0 ? (correctCount / problems.length) * 100 : 0,
      });
    }
  }, [
    result,
    problem,
    moves,
    currentProblemIndex,
    problemCount,
    selectedPieces,
    onComplete,
  ]);

  return {
    problem,
    moves,
    selectedFile,
    result,
    isShowingResult,
    currentProblemIndex,
    problemCount,
    startSession,
    handleFilePress,
    handleRankPress,
    handleUndo,
    handleSubmit,
    handleSkip,
    handleNextProblem,
  };
}
