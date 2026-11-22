import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../theme";
import { useCloseSession } from "./use-close-session";

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
 * header-less timed sessions, in its own top row. The hit area is the 44pt
 * minimum even though the glyph is smaller.
 */
export function SessionCloseButton({ confirm = false, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { close } = useCloseSession();
  const leave = onClose ?? close;

  const handlePress = () => {
    if (!confirm) {
      leave();
      return;
    }
    Alert.alert(t("common.quitConfirmTitle"), t("common.quitConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.quit"), style: "destructive", onPress: leave },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      testID="session-close"
      style={styles.button}
    >
      <Ionicons name="close" size={26} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
