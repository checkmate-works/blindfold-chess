import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PracticeLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#fff",
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
