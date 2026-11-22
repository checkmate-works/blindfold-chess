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
import {
  pickSymmetryCoordinate,
  type SymmetryAnswer,
  type SymmetryPick,
} from "../../../../features/board-symmetry/lib/selection";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { useCloseSession } from "../../../../navigation/use-close-session";

const BATCH_SIZE = 100;

/**
 * Untimed board-symmetry drill (the web's `/board-symmetry/training`): the
 * session's question and file/rank pickers with no clock. The answer goes
 * in as soon as both a file and a rank are picked, as in the session, and
 * a wrong answer shows the correct square until the next question.
 *
 * The answer is submitted from the pickers' tap handler, not from an effect
 * watching the selection. The session hides the result and moves to the next
 * question in the same render, so an effect would still see the previous
 * question's file and rank there and submit them to the new question before
 * the pickers are cleared; reordering the effects does not help. The other
 * untimed drills also submit from the input callback.
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

  // Clear the pickers when the next question arrives.
  useEffect(() => {
    setSelectedFile(null);
    setSelectedRank(null);
  }, [currentQuestion]);

  // The next selection is computed from this render's state, outside any
  // setState updater, so handleAnswer runs once per tap that completes the
  // selection and never on a render the user did not cause.
  const handlePick = (pick: SymmetryPick) => {
    const { selection, answer } = pickSymmetryCoordinate(
      { file: selectedFile, rank: selectedRank },
      pick,
      showResult,
    );
    setSelectedFile(selection.file);
    setSelectedRank(selection.rank);
    if (answer) handleAnswer(answer, false, answerHaptics);
  };

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
          onFileToggle={(value) => handlePick({ kind: "file", value })}
          onRankToggle={(value) => handlePick({ kind: "rank", value })}
          disabled={showResult}
        />
      </View>
    </PracticeTrainingScreen>
  );
}
