import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FILES, RANKS } from "@blindfold-chess/types";

import {
  Button,
  CoordinateKeyRow,
  coordinateKeypadStyles,
} from "../../../components";
import { useTheme, spacing, fontSize, feedbackColors } from "../../../theme";

type BlindMoveInputProps = {
  visitedSquares: ReadonlyMap<string, number>;
  availableMoves: readonly string[];
  /** Called only with a legal, unvisited knight move. */
  onMove: (square: string) => void;
};

/**
 * Blindfold-mode move entry: pick a file and a rank, then submit. Mirrors the
 * web flow — either key can be toggled off again, and a visited or illegal
 * square is rejected with a message and the selection cleared.
 */
export function BlindMoveInput({
  visitedSquares,
  availableMoves,
  onMove,
}: BlindMoveInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [file, setFile] = useState<string | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setRank(null);
  };

  const handleSubmit = () => {
    if (!file || !rank) return;
    const square = `${file}${rank}`;
    reset();
    if (visitedSquares.has(square)) {
      setError(t("knightTour.session.alreadyVisited"));
      return;
    }
    if (!availableMoves.includes(square)) {
      setError(t("knightTour.session.invalidMove"));
      return;
    }
    setError(null);
    onMove(square);
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          coordinateKeypadStyles.stepIndicator,
          { color: colors.mutedForeground },
        ]}
      >
        {file === null
          ? t("knightTour.session.selectFile")
          : t("knightTour.session.selectRank")}
      </Text>
      <CoordinateKeyRow
        keys={FILES}
        enabled
        activeKey={file}
        onPress={(key) => {
          setError(null);
          setFile(key === file ? null : key);
        }}
      />
      <CoordinateKeyRow
        keys={RANKS}
        enabled
        activeKey={rank}
        onPress={(key) => {
          setError(null);
          setRank(key === rank ? null : key);
        }}
      />
      <Button
        title={t("knightTour.session.submitMove")}
        onPress={handleSubmit}
        disabled={!file || !rank}
        fullWidth
      />
      <Text style={styles.error}>{error ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  error: {
    color: feedbackColors.error,
    fontSize: fontSize.sm,
    textAlign: "center",
    minHeight: 20,
  },
});
