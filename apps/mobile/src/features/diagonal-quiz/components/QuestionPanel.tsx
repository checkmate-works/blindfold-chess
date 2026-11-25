import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { UseDiagonalQuizReturn } from "@blindfold-chess/features/diagonal-quiz/client";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { DiagonalInputFields, type FieldResult } from "./DiagonalInputFields";
import { FileRankButtons } from "./FileRankButtons";

/** The web's `text-6xl`: 60px, line height 1. */
const SQUARE_SIZE = 60;

type QuestionPanelProps = {
  /** The square asked about; null before the first one arrives. */
  square: string | null;
  input: UseDiagonalQuizReturn["input"];
  singleDiagonal: boolean;
  singleAntiDiagonal: boolean;
  /** Fields and keypad take no input (countdown, verdict, server wait). */
  disabled: boolean;
  diagonalResult: FieldResult;
  antiDiagonalResult: FieldResult;
  /** The challenge's countdown, shown where the square will appear. */
  countdown?: number | null;
};

/**
 * The question and its answer surface, laid out as the web's
 * `DiagonalAnswerPanel` under its question title: "What are the diagonals
 * of e4?", the square at 60, 24 below it the two fields (tinted with the
 * verdict), 24 below those the step hint and the keypad. Challenge and
 * training both stack it from the top, as the web does.
 */
export function QuestionPanel({
  square,
  input,
  singleDiagonal,
  singleAntiDiagonal,
  disabled,
  diagonalResult,
  antiDiagonalResult,
  countdown = null,
}: QuestionPanelProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showSquare = countdown === null && square !== null;

  return (
    <View style={styles.panel}>
      {/* The title keeps its line during the countdown so nothing below
          moves when the square appears. */}
      <Text style={[styles.title, { color: colors.foreground }]}>
        {showSquare ? t("diagonalQuiz.session.question", { square }) : " "}
      </Text>

      <Text
        style={[
          styles.square,
          { color: showSquare ? colors.foreground : colors.primary },
        ]}
      >
        {countdown !== null
          ? countdown > 0
            ? String(countdown)
            : "START!"
          : (square ?? " ")}
      </Text>

      <View style={styles.fields}>
        <DiagonalInputFields
          diagonalStartText={input.diagonalStartText}
          diagonalEndText={input.diagonalEndText}
          antiDiagonalStartText={input.antiDiagonalStartText}
          antiDiagonalEndText={input.antiDiagonalEndText}
          activeField={input.activeField}
          isDiagonalComplete={input.isDiagonalComplete}
          isAntiDiagonalComplete={input.isAntiDiagonalComplete}
          isInputtingStart={input.isInputtingStart}
          isInputtingEnd={input.isInputtingEnd}
          singleDiagonal={showSquare && singleDiagonal}
          singleAntiDiagonal={showSquare && singleAntiDiagonal}
          disabled={disabled}
          onFieldPress={(field) => {
            if (!disabled) input.setActiveField(field);
          }}
          diagonalResult={diagonalResult}
          antiDiagonalResult={antiDiagonalResult}
        />
      </View>

      <FileRankButtons
        expectingFile={input.expectingFile}
        expectingRank={input.expectingRank}
        disabled={disabled}
        onFilePress={input.handleFilePress}
        onRankPress={input.handleRankPress}
        onBackspace={input.handleBackspace}
        onClear={input.handleClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.lg,
  },
  // The web's question title: `text-base font-medium mb-4`.
  title: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  // The web's `text-6xl font-bold mb-4` in a block with `mb-6`.
  square: {
    fontSize: SQUARE_SIZE,
    lineHeight: SQUARE_SIZE + 6,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    marginBottom: spacing.md + spacing.lg,
  },
  // The web's `mb-6` under the fields.
  fields: {
    marginBottom: spacing.lg,
  },
});
