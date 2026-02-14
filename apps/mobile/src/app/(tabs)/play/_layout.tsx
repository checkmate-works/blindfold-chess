import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../theme";

export default function PlayLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerBackTitle: t("common.back"),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ai-game/setup"
        options={{
          title: t("aiGame.setup.title"),
        }}
      />
      <Stack.Screen
        name="ai-game/session"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ai-game/result"
        options={{
          title: t("aiGame.result.title"),
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
