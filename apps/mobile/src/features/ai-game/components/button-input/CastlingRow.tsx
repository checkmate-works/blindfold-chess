import { View, StyleSheet } from "react-native";

import { spacing, type ThemeColors } from "../../../../theme";
import { ToggleButton } from "../ToggleButton";

/** The O-O / O-O-O castling selector row of the button input. */
export function CastlingRow({
  castling,
  onSelect,
  disabled,
  colors,
}: {
  castling: string | null;
  onSelect: (token: "O-O" | "O-O-O") => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.row}>
      <ToggleButton
        label="O-O"
        isSelected={castling === "O-O"}
        onPress={() => onSelect("O-O")}
        disabled={disabled}
        colors={colors}
        wide
      />
      <ToggleButton
        label="O-O-O"
        isSelected={castling === "O-O-O"}
        onPress={() => onSelect("O-O-O")}
        disabled={disabled}
        colors={colors}
        wide
      />
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
});
