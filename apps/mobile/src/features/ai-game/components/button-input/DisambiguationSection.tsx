import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import {
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  type ThemeColors,
} from "../../../../theme";
import { ToggleButton } from "../ToggleButton";
import { FILES, RANKS } from "./constants";

/**
 * The piece-move disambiguation controls: the "Disambiguation" toggle and —
 * while it is on — the source file / source rank picker panel.
 */
export function DisambiguationSection({
  isAmbiguous,
  onToggleAmbiguous,
  sourceFile,
  sourceRank,
  onSourceFileSelect,
  onSourceRankSelect,
  disabled,
  colors,
  labels,
}: {
  isAmbiguous: boolean;
  onToggleAmbiguous: () => void;
  sourceFile: string | null;
  sourceRank: string | null;
  onSourceFileSelect: (file: string) => void;
  onSourceRankSelect: (rank: string) => void;
  disabled?: boolean;
  colors: ThemeColors;
  labels: { toggle: string; sourceLabel: string };
}) {
  return (
    <>
      {/* Disambiguation Toggle */}
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onToggleAmbiguous}
          disabled={disabled}
          style={[
            styles.disambiguationToggle,
            {
              backgroundColor: isAmbiguous
                ? colors.primary + "1A"
                : "transparent",
              borderColor: isAmbiguous ? colors.primary : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.disambiguationToggleText,
              {
                color: isAmbiguous ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {labels.toggle}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Disambiguation Panel */}
      {isAmbiguous && (
        <View
          style={[
            styles.disambiguationPanel,
            {
              backgroundColor: colors.muted + "4D",
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.disambiguationLabel,
              { color: colors.mutedForeground },
            ]}
          >
            {labels.sourceLabel}
          </Text>
          {/* Source File */}
          <View style={styles.row}>
            {FILES.map((file) => (
              <ToggleButton
                key={`src-file-${file}`}
                label={file}
                isSelected={sourceFile === file}
                onPress={() => onSourceFileSelect(file)}
                disabled={disabled}
                colors={colors}
                small
              />
            ))}
          </View>
          {/* Source Rank */}
          <View style={styles.row}>
            {RANKS.map((rank) => (
              <ToggleButton
                key={`src-rank-${rank}`}
                label={rank}
                isSelected={sourceRank === rank}
                onPress={() => onSourceRankSelect(rank)}
                disabled={disabled}
                colors={colors}
                small
              />
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  disambiguationToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  disambiguationToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  disambiguationPanel: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  disambiguationLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
