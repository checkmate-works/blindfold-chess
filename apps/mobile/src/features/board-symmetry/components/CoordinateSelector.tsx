import { StyleSheet, View } from "react-native";

import { CoordinateKeyRow } from "../../../components";
import { spacing } from "../../../theme";
import { FILES, RANKS } from "../lib/types";

type CoordinateSelectorProps = {
  selectedFile: string | null;
  selectedRank: string | null;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  /** Dims the pad to half and swallows its taps. */
  disabled?: boolean;
};

/**
 * The file and rank pads of the web's `CoordinateInput`: eight keys across
 * the column in each row (4 apart, the rows 8 apart, 44 tall), the picked
 * file and rank filled in the primary colour.
 *
 * While locked the whole pad fades to half, as the web's `opacity-50`,
 * rather than through each key's own disabled look: the keys stay readable
 * while the verdict on the answer is shown.
 */
export function CoordinateSelector({
  selectedFile,
  selectedRank,
  onFileToggle,
  onRankToggle,
  disabled = false,
}: CoordinateSelectorProps) {
  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <CoordinateKeyRow
        keys={FILES}
        enabled
        activeKey={selectedFile}
        onPress={onFileToggle}
      />
      <CoordinateKeyRow
        keys={RANKS}
        enabled
        activeKey={selectedRank}
        onPress={onRankToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `max-w-md` and `gap-2`.
  container: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
