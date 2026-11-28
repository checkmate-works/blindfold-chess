import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme, touchTarget, borderRadius } from "../theme";
import { useQuitSession } from "./use-quit-session";

type Props = {
  /**
   * Ask before leaving. Timed sessions pass true: closing one throws away
   * the run. Results and training runs lose nothing and close at once.
   */
  confirm?: boolean;
  /** Runs instead of the default close (e.g. a session's own finish). */
  onClose?: () => void;
};

/**
 * The × that leaves the full-screen session modal (`useCloseSession`).
 *
 * A full-screen modal has no swipe to dismiss and no back chevron, so every
 * screen in `(session)` shows this button in its header or, for the
 * header-less timed sessions, in its own top row. The hit area is the platform
 * minimum even though the glyph is smaller.
 */
export function SessionCloseButton({ confirm = false, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const handlePress = useQuitSession({ confirm, onClose });

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      testID="session-close"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
    >
      <Ionicons name="close" size={26} color={colors.foreground} />
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
