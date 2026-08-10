import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  borderRadius,
  touchTarget,
} from "../theme";

/** The eight file keys, left to right as they sit on the board. */
export const FILE_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];
/** The eight rank keys. */
export const RANK_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];

type CoordinateKeyRowProps = {
  keys: readonly string[];
  /** When false the whole row dims to 0.3 and stops accepting taps. */
  enabled: boolean;
  /**
   * The key currently held as part of a half-entered coordinate, drawn in the
   * primary colour. Route-planner shows the chosen file this way while the
   * player picks a rank; the modules that consume a coordinate immediately
   * pass nothing.
   */
  activeKey?: string | null;
  onPress: (key: string) => void;
};

/**
 * One row of eight algebraic keys.
 *
 * @description
 * The file/rank keypad is how three modules take a square from the player,
 * and each had its own copy of the row: the same `flex: 1` keys at
 * `touchTarget.minSize`, the same `opacity: 0.3` disabled treatment, the same
 * tabular-figure label. Keeping the touch target here matters more than the
 * line count — it is an accessibility floor, and a floor enforced in three
 * places is a floor that eventually differs in one.
 */
export function CoordinateKeyRow({
  keys,
  enabled,
  activeKey = null,
  onPress,
}: CoordinateKeyRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {keys.map((key) => {
        const isActive = activeKey === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onPress(key)}
            disabled={!enabled}
            activeOpacity={0.7}
            style={[
              styles.key,
              {
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: isActive ? colors.primary : colors.background,
                opacity: enabled ? 1 : 0.3,
              },
            ]}
          >
            <Text
              style={[
                styles.keyText,
                {
                  color: isActive
                    ? colors.primaryForeground
                    : enabled
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
    borderRadius: borderRadius.md,
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
