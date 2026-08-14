import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import type { ModuleRoute } from "../../../navigation/module-stack-screens";
import {
  moduleStackScreenOptions,
  moduleStackScreens,
} from "../../../navigation/module-stack-screens";
import { useTheme } from "../../../theme";

const PRACTICE_MODULES: readonly ModuleRoute[] = [
  { route: "coordinate-quiz", i18nKey: "coordinateQuiz" },
  { route: "legal-moves", i18nKey: "legalMoves" },
  { route: "board-symmetry", i18nKey: "boardSymmetry" },
  { route: "square-colors", i18nKey: "squareColors" },
  { route: "diagonal-quiz", i18nKey: "diagonalQuiz" },
  { route: "route-planner", i18nKey: "routePlanner" },
];

export default function PracticeLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack screenOptions={moduleStackScreenOptions(colors, t)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {moduleStackScreens(t, PRACTICE_MODULES)}
    </Stack>
  );
}
