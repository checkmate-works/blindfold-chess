import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../theme";

export default function PracticeLayout() {
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
        name="coordinate-quiz/setup"
        options={{
          title: t("coordinateQuiz.setup.title"),
        }}
      />
      <Stack.Screen
        name="coordinate-quiz/session"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="coordinate-quiz/result"
        options={{
          title: t("coordinateQuiz.result.title"),
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
