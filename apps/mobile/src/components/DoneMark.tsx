import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../theme";

const SIZES = {
  sm: { circle: 16, check: 11 },
  md: { circle: 22, check: 15 },
} as const;

type DoneMarkProps = {
  /**
   * What a screen reader says for the mark ("Read", "Tried"). Left out, the
   * mark is decoration and hidden from screen readers: use that where the
   * row's or cell's own label already says it is done.
   */
  readonly label?: string;
  /**
   * `"md"` (the default) closes a list row, in a row's value position;
   * `"sm"` stands beside a line of text, such as a stage cell's value.
   */
  readonly size?: keyof typeof SIZES;
};

/**
 * The app's one mark for "done": a white check cut out of a filled
 * `colors.success` circle.
 *
 * @description
 * Every place that says something is finished — a guide read through, a
 * challenge tried, a stage completed, a requirement met — draws this mark,
 * so "done" looks the same on every screen and is never confused with the
 * other checks of the app (a list's selected row, a valid input), which stay
 * plain glyphs. A bare "✓" in a value slot was the earlier form; as text it
 * takes the value's grey and reads as one more number rather than a state.
 *
 * The check is `successForeground` over `success`, the pair the theme
 * defines for content on the success colour, so it stays legible in both
 * colour schemes.
 */
export function DoneMark({ label, size = "md" }: DoneMarkProps) {
  const { colors } = useTheme();
  const { circle, check } = SIZES[size];
  const spoken = label !== undefined;
  return (
    <View
      accessible={spoken}
      accessibilityRole={spoken ? "image" : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!spoken}
      importantForAccessibility={spoken ? "auto" : "no-hide-descendants"}
      style={[
        styles.circle,
        {
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          backgroundColor: colors.success,
        },
      ]}
    >
      <Ionicons
        name="checkmark"
        size={check}
        color={colors.successForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
});
