import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { fontSize, fontWeight, useTheme } from "../../../theme";

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

type DiagonalAnswerComparisonProps = {
  correctDiagonal: string;
  correctAntiDiagonal: string;
  /** Absent when nothing was answered (the question the time ran out on). */
  userDiagonal?: string;
  userAntiDiagonal?: string;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
};

/**
 * The web's `DiagonalAnswerComparison`: a three-column table, the line
 * (╱ Diagonal, ╲ Anti-diagonal) against the correct answer in green and the
 * player's in green or red, "—" where there is none. Up to 320 wide.
 */
export function DiagonalAnswerComparison({
  correctDiagonal,
  correctAntiDiagonal,
  userDiagonal,
  userAntiDiagonal,
  isDiagonalCorrect,
  isAntiDiagonalCorrect,
}: DiagonalAnswerComparisonProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const [headingHeight, setHeadingHeight] = useState(24);

  const userColor = (answer: string | undefined, correct: boolean) =>
    !answer
      ? colors.mutedForeground
      : correct
        ? feedbackColors.success
        : feedbackColors.error;

  // The label column sits beside a block of three rows: the headings, then
  // one row per line. A heading can wrap (the web's does at this width
  // too), so the label column's blank top cell takes the heading row's
  // measured height and the labels stay level with their answers.
  return (
    <View style={styles.table}>
      <View>
        <View style={{ height: headingHeight }} />
        <Text
          style={[styles.cell, styles.rowLabel, { color: colors.foreground }]}
        >
          <Text style={{ color: colors.mutedForeground }}>╱ </Text>
          {t("diagonalQuiz.board.diagonal")}
        </Text>
        <Text
          style={[styles.cell, styles.rowLabel, { color: colors.foreground }]}
        >
          <Text style={{ color: colors.mutedForeground }}>╲ </Text>
          {t("diagonalQuiz.board.antiDiagonal")}
        </Text>
      </View>
      <View style={styles.values}>
        <View
          style={styles.row}
          onLayout={(event) =>
            setHeadingHeight(event.nativeEvent.layout.height)
          }
        >
          <Text
            style={[
              styles.cell,
              styles.heading,
              { color: feedbackColors.success },
            ]}
          >
            {t("diagonalQuiz.session.correctAnswerLabel")}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.heading,
              { color: colors.mutedForeground },
            ]}
          >
            {t("diagonalQuiz.session.yourAnswer")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            style={[
              styles.cell,
              styles.mono,
              { color: feedbackColors.success },
            ]}
          >
            {correctDiagonal}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.mono,
              { color: userColor(userDiagonal, isDiagonalCorrect) },
            ]}
          >
            {userDiagonal || "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            style={[
              styles.cell,
              styles.mono,
              { color: feedbackColors.success },
            ]}
          >
            {correctAntiDiagonal}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.mono,
              { color: userColor(userAntiDiagonal, isAntiDiagonalCorrect) },
            ]}
          >
            {userAntiDiagonal || "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `mx-auto max-w-xs grid grid-cols-[auto_1fr_1fr] gap-x-4
  // gap-y-2 text-sm`.
  table: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  values: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  cell: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: 8,
  },
  rowLabel: {
    flex: 0,
    fontWeight: fontWeight.bold,
  },
  // The web's `text-xs font-medium uppercase tracking-wide`.
  heading: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    fontWeight: fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mono: {
    fontFamily: MONO,
  },
});
