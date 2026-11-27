import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  fenToPieceList,
  isBlackToMoveFromFen,
} from "@blindfold-chess/features/chess-core";

import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../../theme";

/**
 * The web's `PiecesInfo`: a card with the side to move and both sides'
 * pieces as text ("K Q R a1 …"), so the position can be read without the
 * board. `showSideToMove` leaves the side to move out, as the web does for
 * position memory, where the task is only to recall the position.
 */
export function PiecesInfo({
  fen,
  showSideToMove = true,
}: {
  fen: string;
  showSideToMove?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pieces = fenToPieceList(fen);
  const line = (label: string, list: string[]) => (
    <Text style={[styles.text, { color: colors.foreground }]}>
      <Text style={styles.label}>{label}:</Text>{" "}
      {list.length > 0 ? list.join(" ") : t("puzzle.detail.noPieces")}
    </Text>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {showSideToMove ? (
        <Text style={[styles.text, styles.label, { color: colors.foreground }]}>
          {isBlackToMoveFromFen(fen)
            ? t("puzzle.blackToMove")
            : t("puzzle.whiteToMove")}
        </Text>
      ) : null}
      {line(t("puzzle.detail.whitePiecesLabel"), pieces.white)}
      {line(t("puzzle.detail.blackPiecesLabel"), pieces.black)}
    </View>
  );
}

const styles = StyleSheet.create({
  // `rounded-lg border bg-card p-4 space-y-2`.
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
});
