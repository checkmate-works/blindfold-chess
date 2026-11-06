import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import type { ModuleRoute } from "../../../navigation/module-stack-screens";
import {
  moduleStackScreenOptions,
  moduleStackScreens,
} from "../../../navigation/module-stack-screens";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../../navigation/practice-modules";
import { useTheme } from "../../../theme";

const PRACTICE_MODULE_ROUTES: readonly ModuleRoute[] =
  MOBILE_PRACTICE_MODULES.map((module) => ({
    route: practiceModuleRoute(module),
    i18nKey: module.i18nKey,
    hasTraining: module.hasTraining,
  }));

export default function PracticeLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack screenOptions={moduleStackScreenOptions(colors, t)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {moduleStackScreens(t, PRACTICE_MODULE_ROUTES)}
    </Stack>
  );
}
