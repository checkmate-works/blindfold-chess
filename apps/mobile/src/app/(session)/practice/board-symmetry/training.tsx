import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  checkSymmetryAnswer,
  generateProblem,
} from "@blindfold-chess/features/board-symmetry";
import type { BoardSymmetryProblem } from "@blindfold-chess/features/board-symmetry";
import { FEEDBACK_FLASH_MS } from "@blindfold-chess/features/common";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";

import {
  PracticeTrainingScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  CoordinateSelector,
  SymmetryQuestion,
} from "../../../../features/board-symmetry/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { useCloseSession } from "../../../../navigation/use-close-session";

const BATCH_SIZE = 100;

type SymmetryAnswer = { file: string; rank: string };

/**
 * Untimed board-symmetry drill (the web's `/board-symmetry/training`): the
 * session's question and file/rank pickers with no clock. The answer goes
 * in as soon as both a file and a rank are picked, as in the session, and
 * a wrong answer shows the correct square until the next question.
 */
export default function BoardSymmetryTraining() {
  const { close } = useCloseSession("/practice/board-symmetry");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<BoardSymmetryProblem, SymmetryAnswer>({
    batchSize: BATCH_SIZE,
    generateBatch: (size) =>
      Array.from({ length: size }, () => generateProblem()),
    checkAnswer: (problem, { file, rank }) =>
      checkSymmetryAnswer(file, rank, problem).isCorrect,
    feedbackDelayMs: (correct) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
  });

  useEffect(() => {
    if (selectedFile && selectedRank && !showResult) {
      handleAnswer(
        { file: selectedFile, rank: selectedRank },
        false,
        answerHaptics,
      );
    }
  }, [selectedFile, selectedRank, showResult, handleAnswer]);

  // Clear the pickers when the next question arrives.
  useEffect(() => {
    setSelectedFile(null);
    setSelectedRank(null);
  }, [currentQuestion]);

  const correctSolution =
    showResult && lastAnswer && !lastAnswer.correct
      ? checkSymmetryAnswer("", "", lastAnswer.question).correctSquare
      : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentQuestion && (
          <SymmetryQuestion
            problem={currentQuestion}
            selectedFile={selectedFile}
            selectedRank={selectedRank}
            isCorrect={showResult && lastAnswer ? lastAnswer.correct : null}
            correctSolution={correctSolution}
          />
        )}
      </View>
      <View style={practiceSessionStyles.bottomSection}>
        <CoordinateSelector
          selectedFile={selectedFile}
          selectedRank={selectedRank}
          onFileToggle={(f) => setSelectedFile((cur) => (cur === f ? null : f))}
          onRankToggle={(r) => setSelectedRank((cur) => (cur === r ? null : r))}
          disabled={showResult}
        />
      </View>
    </PracticeTrainingScreen>
  );
}
