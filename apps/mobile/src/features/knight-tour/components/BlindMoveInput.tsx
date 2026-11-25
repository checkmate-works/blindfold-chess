import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType } from "@blindfold-chess/types";

import { Button, CoordinateInput } from "../../../components";
import { useTheme, fontSize } from "../../../theme";

/** The web's read-only piece row: K Q R B N, with the knight lit. */
const PIECE_ROW: readonly PieceType[] = ["k", "q", "r", "b", "n"];

type BlindMoveInputProps = {
  visitedSquares: ReadonlyMap<string, number>;
  availableMoves: readonly string[];
  /** Called only with a legal, unvisited knight move. */
  onMove: (square: string) => void;
};

/**
 * Blindfold-mode move entry, the web's `PieceCoordinateInput` with the
 * knight lit: the piece row (an indicator, not a control), the file keys,
 * the rank keys, then Submit over a rule. Either key toggles off on a
 * second press; a visited or illegal square is rejected with the web's
 * message and the keys are cleared.
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

  const handleSubmit = () => {
    if (!file || !rank) return;
    const square = `${file}${rank}`;
    setFile(null);
    setRank(null);
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
      <View style={styles.pieces} accessibilityElementsHidden>
        {PIECE_ROW.map((piece) => (
          <View
            key={piece}
            style={[
              styles.piece,
              piece === "n"
                ? {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  }
                : {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: 0.5,
                  },
            ]}
          >
            <ChessPieceIcon type={piece} color="w" size={24} />
          </View>
        ))}
      </View>
      <CoordinateInput
        selectedFile={file}
        onFilePress={(key) => {
          setError(null);
          setFile(key === file ? null : key);
        }}
        showRanks={false}
      />
      <CoordinateInput
        selectedRank={rank}
        onRankPress={(key) => {
          setError(null);
          setRank(key === rank ? null : key);
        }}
        showFiles={false}
      />
      <View style={[styles.action, { borderTopColor: colors.border }]}>
        <Button
          title={t("knightTour.session.submitMove")}
          onPress={handleSubmit}
          disabled={!file || !rank}
          fullWidth
          testID="knight-tour-submit"
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * The web's `flex flex-col gap-3`, its `w-9 h-9 rounded-md` piece buttons
 * `gap-2` apart, the submit row's `pt-4 border-t mt-2` and the `text-sm`
 * error.
 */
const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  pieces: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  piece: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  error: {
    fontSize: fontSize.sm,
  },
});
