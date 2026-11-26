import type Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { Button } from "./Button";
import { spacing } from "../theme";

type ModeButton = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

type ModeButtonRowProps = {
  /** The left, outlined button. */
  secondary: ModeButton;
  /** The right, filled button: the primary action, nearest the thumb. */
  primary: ModeButton;
  disabled?: boolean;
};

/**
 * Two equal-width actions side by side in a footer: the secondary one on
 * the left (outlined), the primary one on the right (filled). Widths stay
 * equal and only the fill tells the primary apart: a narrower button would
 * squeeze its label. The setup screen's Training / Challenge and the result
 * screen's back-to-menu / play-again share it, so a module's footers keep
 * one shape from before a run to after it.
 *
 * Both actions use the shared footer size and stretch to equal height
 * when either translated label wraps.
 */
export function ModeButtonRow({
  secondary,
  primary,
  disabled = false,
}: ModeButtonRowProps) {
  return (
    <View style={styles.row}>
      <Button
        title={secondary.title}
        icon={secondary.icon}
        onPress={secondary.onPress}
        disabled={disabled}
        variant="outline"
        size="lg"
        style={styles.button}
        testID={secondary.testID}
      />
      <Button
        title={primary.title}
        icon={primary.icon}
        onPress={primary.onPress}
        disabled={disabled}
        size="lg"
        style={styles.button}
        testID={primary.testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexBasis: 0,
    paddingHorizontal: spacing.sm,
  },
});
