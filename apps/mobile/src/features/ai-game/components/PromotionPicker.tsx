import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceColor } from "@blindfold-chess/icons";
import type { PieceType } from "@blindfold-chess/types";

import { useTheme } from "../../../theme";

/** Queen first, where the finger already is; then lichess's order. */
const CHOICES = [
  { type: "q", label: "queen" },
  { type: "n", label: "knight" },
  { type: "r", label: "rook" },
  { type: "b", label: "bishop" },
] as const satisfies readonly { type: PieceType; label: string }[];

type PromotionPickerProps = {
  squareSize: number;
  /** The promotion square's column and row as drawn (0 = left / top). */
  column: number;
  row: number;
  color: PieceColor;
  onSelect: (type: PieceType) => void;
  onCancel: () => void;
};

/**
 * The four promotion pieces in a column over the promotion square, running
 * from the board's edge toward its middle as on lichess and the web board,
 * over a scrim that cancels the move when tapped. Laid over the board, in
 * the board's own coordinates, so it needs no measuring.
 *
 * The pieces are drawn as themselves whatever the blindfold settings: the
 * player is choosing what to make, not looking at the position.
 */
export function PromotionPicker({
  squareSize,
  column,
  row,
  color,
  onSelect,
  onCancel,
}: PromotionPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // A promotion square is always on the top or bottom row as drawn.
  const fromTop = row === 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        // aiGame.session.cancelPromotion
        accessibilityLabel={t("aiGame.session.cancelPromotion")}
        onPress={onCancel}
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          { backgroundColor: colors.page },
        ]}
      />
      <View
        style={[
          styles.column,
          {
            left: column * squareSize,
            width: squareSize,
            flexDirection: fromTop ? "column" : "column-reverse",
            ...(fromTop ? { top: 0 } : { bottom: 0 }),
            backgroundColor: colors.card,
            borderColor: colors.panelBorder,
          },
        ]}
      >
        {CHOICES.map(({ type, label }) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            // aiGame.session.promoteTo.{queen,knight,rook,bishop}
            accessibilityLabel={t(`aiGame.session.promoteTo.${label}`)}
            onPress={() => onSelect(type)}
            style={({ pressed }) => [
              styles.choice,
              {
                width: squareSize,
                height: squareSize,
                backgroundColor: pressed ? colors.muted : "transparent",
              },
            ]}
          >
            <ChessPieceIcon type={type} color={color} size={squareSize * 0.8} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    opacity: 0.6,
  },
  column: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  choice: {
    alignItems: "center",
    justifyContent: "center",
  },
});
