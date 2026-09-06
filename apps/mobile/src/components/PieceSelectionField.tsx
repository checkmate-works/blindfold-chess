import { View, Text, StyleSheet } from "react-native";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";
import { SelectableChip } from "./SelectableChip";

type PieceSelectionFieldProps<P extends string> = {
  label: string;
  pieces: readonly P[];
  /** The glyph shown above each chip's label. */
  displayMap: Record<P, string>;
  selected: readonly P[];
  labelFor: (piece: P) => string;
  onToggle: (piece: P) => void;
};

/**
 * The labelled row of piece chips a settings screen offers, as a multi-select.
 *
 * Deliberately not an `OptionsField`, which is the single-select counterpart:
 * every chip carries its own selected state rather than one value winning.
 * legal-moves and route-planner had this written out separately, down to the
 * comment saying so, and differed only in which piece set they iterate.
 */
export function PieceSelectionField<P extends string>({
  label,
  pieces,
  displayMap,
  selected,
  labelFor,
  onToggle,
}: PieceSelectionFieldProps<P>) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.optionsRow}>
        {pieces.map((piece) => (
          <SelectableChip
            key={piece}
            icon={displayMap[piece]}
            label={labelFor(piece)}
            selected={selected.includes(piece)}
            onPress={() => onToggle(piece)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
