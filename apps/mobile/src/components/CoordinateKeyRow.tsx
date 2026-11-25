import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme, fontSize, fontWeight, touchTarget } from "../theme";

type CoordinateKeyRowProps = {
  keys: readonly string[];
  /** When false every key in the row takes the disabled look below. */
  enabled: boolean;
  /**
   * Disables single keys, with the same look as `enabled={false}`: the key
   * fades to 0.3, its label turns muted and it stops accepting taps.
   */
  isKeyDisabled?: (key: string) => boolean;
  /**
   * The key currently held as part of a half-entered coordinate, drawn in the
   * primary colour. A keypad that stages a file and a rank before committing
   * them shows the staged keys this way; one that consumes each key
   * immediately passes nothing.
   */
  activeKey?: string | null;
  onPress: (key: string) => void;
};

/**
 * One row of eight algebraic keys.
 *
 * @description
 * The file/rank keypad is how the practice modules take a square from the
 * player, and each used to have its own copy of the row: the same `flex: 1`
 * keys at `touchTarget.minSize`, the same `opacity: 0.3` disabled treatment,
 * the same tabular-figure label. Keeping the touch target here matters more
 * than the line count — it is an accessibility floor, and a floor enforced
 * in several places is a floor that eventually differs in one.
 *
 * A module that wants the whole file-and-rank pad uses `CoordinateInput`,
 * which is built from two of these rows; a module that only needs the rows
 * themselves (knight tour) uses this directly.
 */
export function CoordinateKeyRow({
  keys,
  enabled,
  activeKey = null,
  isKeyDisabled,
  onPress,
}: CoordinateKeyRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {keys.map((key) => {
        const isActive = activeKey === key;
        const isEnabled = enabled && !isKeyDisabled?.(key);
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onPress(key)}
            disabled={!isEnabled}
            activeOpacity={0.7}
            style={[
              styles.key,
              {
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: isActive ? colors.primary : colors.background,
                opacity: isEnabled ? 1 : 0.3,
              },
            ]}
          >
            <Text
              style={[
                styles.keyText,
                {
                  color: isActive
                    ? colors.primaryForeground
                    : isEnabled
                      ? colors.foreground
                      : colors.mutedForeground,
                },
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Shared with the keypads' surrounding chrome so the "select a file" /
 * "select a rank" prompt reserves the same height everywhere and the layout
 * does not jump as the prompt changes.
 */
export const coordinateKeypadStyles = StyleSheet.create({
  stepIndicator: {
    fontSize: fontSize.sm,
    textAlign: "center",
    minHeight: 20,
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  key: {
    flex: 1,
    minHeight: touchTarget.minSize,
    // The web keypad's `rounded-md`, not the theme's 8.
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
});
