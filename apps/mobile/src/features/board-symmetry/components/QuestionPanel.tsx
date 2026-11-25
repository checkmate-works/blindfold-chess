import { StyleSheet, View } from "react-native";

import { CoordinateInput } from "../../../components";
import { spacing } from "../../../theme";
import type { BoardSymmetryProblem } from "../lib/types";
import { SymmetryQuestion } from "./SymmetryQuestion";

type QuestionPanelProps = {
  problem: BoardSymmetryProblem | null;
  selectedFile: string | null;
  selectedRank: string | null;
  /** The verdict on the last answer while it is shown, else null. */
  verdict: boolean | null;
  /** The right square, shown under a wrong answer. */
  correctSolution: string | null;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  /**
   * Locks the pad and fades it to half while the verdict is shown, keeping
   * the picked file and rank filled so the answer stays readable.
   */
  disabled: boolean;
  /** The challenge's countdown, shown where `square → answer` will appear. */
  countdown?: number | null;
};

/**
 * The question and the file / rank pad, laid out as the web's
 * `BoardSymmetryQuestionPanel`. Challenge and training both stack it from
 * the top, as the web does, so the pad sits right under the question
 * instead of at the bottom of a tall phone.
 */
export function QuestionPanel({
  problem,
  selectedFile,
  selectedRank,
  verdict,
  correctSolution,
  onFileToggle,
  onRankToggle,
  disabled,
  countdown = null,
}: QuestionPanelProps) {
  return (
    <View style={styles.panel}>
      <SymmetryQuestion
        problem={problem}
        selectedFile={selectedFile}
        selectedRank={selectedRank}
        isCorrect={verdict}
        correctSolution={correctSolution}
        countdown={countdown}
      />
      <CoordinateInput
        selectedFile={selectedFile}
        selectedRank={selectedRank}
        onFilePress={onFileToggle}
        onRankPress={onRankToggle}
        disabled={disabled}
        style={styles.pad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 16 at the sides rather than the 24 of the other panels: eight keys and
   * their gaps then leave each key at least 44 wide on a 390pt phone.
   */
  panel: {
    paddingHorizontal: spacing.md,
  },
  // The web panel's `max-w-md` around the pad.
  pad: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
  },
});
