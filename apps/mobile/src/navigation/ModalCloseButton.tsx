import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme, touchTarget, borderRadius } from "../theme";

/**
 * The × at the left of the first screen of a card-style modal (the account
 * modal), which closes the whole modal. Screens pushed inside the modal show
 * the OS back chevron instead.
 *
 * An ink glyph like the session's × (`SessionCloseButton`) and the header's
 * other icons, rather than a blue "Close" text, so every way out of a modal
 * looks the same. The hit area is the 44pt minimum.
 */
export function ModalCloseButton() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.getParent()?.goBack()}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      testID="header-close"
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
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    borderRadius: borderRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
});
