import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { useGamePreferences } from "../../../../lib/game-preferences";

import {
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
  type ThemeColors,
} from "../../../../theme";
import { ChessPiece } from "../ChessPiece";
import { PIECES, PIECE_TYPE_MAP, PIECE_ICON_SIZE } from "./constants";

/**
 * The K/Q/R/B/N piece selector row of the button input. Each button shows
 * the piece icon or its SAN letter, following the player's
 * `buttonInputPieceLabel` preference.
 */
export function PieceRow({
  selectedPiece,
  onSelect,
  disabled,
  colors,
}: {
  selectedPiece: string | null;
  onSelect: (piece: (typeof PIECES)[number]) => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  const { preferences } = useGamePreferences();
  const asText = preferences.buttonInputPieceLabel === "text";
  return (
    <View style={styles.row}>
      {PIECES.map((piece) => (
        <TouchableOpacity
          key={piece}
          onPress={() => onSelect(piece)}
          disabled={disabled}
          style={[
            styles.toggleButton,
            {
              backgroundColor:
                selectedPiece === piece ? colors.primary : colors.card,
              borderColor:
                selectedPiece === piece ? colors.primary : colors.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {asText ? (
            <Text
              style={[
                styles.letter,
                {
                  color:
                    selectedPiece === piece
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              {piece}
            </Text>
          ) : (
            <ChessPiece
              type={PIECE_TYPE_MAP[piece]}
              color="w"
              size={PIECE_ICON_SIZE}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  toggleButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
