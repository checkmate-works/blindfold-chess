import { Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme, fontSize, fontWeight } from "../theme";

type Props = {
  /** Closes the modal the screen is in (pops it off the root stack). */
  dismiss?: boolean;
  title?: string;
  onPress?: () => void;
};

/**
 * A text button for a modal's header ("Close"), the iOS idiom for leaving
 * a card-style modal; Android shows it the same way. Unlike the header's
 * ink icons it stays blue (`colors.primary`) at 600: blue marks a text
 * action.
 */
export function HeaderTextButton({ dismiss, title, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const handle = () => {
    if (onPress) onPress();
    else if (dismiss) navigation.getParent()?.goBack();
  };
  return (
    <Pressable
      onPress={handle}
      hitSlop={10}
      accessibilityRole="button"
      testID="header-close"
    >
      <Text style={[styles.text, { color: colors.primary }]}>
        {title ?? t("common.close")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: fontSize.md + 1,
    fontWeight: fontWeight.semibold,
  },
});
