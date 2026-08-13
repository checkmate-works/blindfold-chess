import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import type { ModuleRoute } from "../../../navigation/module-stack-screens";
import {
  moduleStackScreenOptions,
  moduleStackScreens,
} from "../../../navigation/module-stack-screens";
import { useTheme } from "../../../theme";

const PLAY_MODULES: readonly ModuleRoute[] = [
  { route: "ai-game", i18nKey: "aiGame" },
];

export default function PlayLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack screenOptions={moduleStackScreenOptions(colors, t)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {moduleStackScreens(t, PLAY_MODULES)}
    </Stack>
  );
}
