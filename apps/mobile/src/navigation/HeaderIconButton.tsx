import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

import { useTheme, touchTarget, borderRadius } from "../theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
};

/**
 * An icon button for the native header's trailing slot (help, share, …).
 * The glyph is ink (`colors.foreground`), the header's tint, like the back
 * chevron; the hit area is padded to platform.
 */
export function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
  testID,
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchTarget.actionSize,
    height: touchTarget.actionSize,
    borderRadius: borderRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
});
