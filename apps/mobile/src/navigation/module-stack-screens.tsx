import { Stack } from "expo-router";
import type { useTranslation } from "react-i18next";

import type { ThemeColors } from "../theme";

type Translate = ReturnType<typeof useTranslation>["t"];

/**
 * A module that owns the standard setup → session → result flow.
 *
 * @property route - Path segment under the layout's directory.
 * @property i18nKey - Namespace holding `setup.title` and `result.title`.
 */
export type ModuleRoute = {
  route: string;
  i18nKey: string;
};

/**
 * Header options shared by the practice and play stacks.
 */
export function moduleStackScreenOptions(colors: ThemeColors, t: Translate) {
  return {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontWeight: "bold" } as const,
    headerBackTitle: t("common.back"),
  };
}

/**
 * The three screens every setup → session → result module registers, with
 * the options that make the flow behave: the session hides its header and
 * disables the back gesture so a swipe cannot abandon a timed run mid-way,
 * and the result screen keeps the gesture disabled and drops the back button
 * so the finished session is not re-entered.
 *
 * Seven modules declared this same twenty-line triple, differing only in the
 * slug and the i18n namespace — which meant a new module could silently ship
 * a swipeable session, and the practice and play stacks could drift apart on
 * what "session" means.
 *
 * Returns an array rather than a fragment: expo-router collects `Screen`
 * children with `React.Children.forEach`, which flattens arrays but treats a
 * fragment as one opaque element.
 */
export function moduleStackScreens(
  t: Translate,
  modules: readonly ModuleRoute[],
) {
  return modules.flatMap(({ route, i18nKey }) => [
    <Stack.Screen
      key={`${route}/setup`}
      name={`${route}/setup`}
      options={{ title: t(`${i18nKey}.setup.title`) }}
    />,
    <Stack.Screen
      key={`${route}/session`}
      name={`${route}/session`}
      options={{ headerShown: false, gestureEnabled: false }}
    />,
    <Stack.Screen
      key={`${route}/result`}
      name={`${route}/result`}
      options={{
        title: t(`${i18nKey}.result.title`),
        headerBackVisible: false,
        gestureEnabled: false,
      }}
    />,
  ]);
}
