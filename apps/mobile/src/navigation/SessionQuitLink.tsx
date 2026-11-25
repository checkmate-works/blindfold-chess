import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { fontSize, useTheme } from "../theme";
import { useQuitSession } from "./use-quit-session";

/**
 * The "Quit" link under a timed session's score, asking before it leaves:
 * the web's `ChallengeQuitControl` (a muted, underlined text link). It does
 * what the header's × does; the link sits where the eye already is at the
 * end of a run, as on the web.
 */
export function SessionQuitLink() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const handlePress = useQuitSession({ confirm: true });

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      testID="session-quit"
      style={styles.button}
    >
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {t("common.quit")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
  },
  text: {
    fontSize: fontSize.sm,
    textDecorationLine: "underline",
  },
});
