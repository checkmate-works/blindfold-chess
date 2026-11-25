import { Stack } from "expo-router";
import type { useTranslation } from "react-i18next";

import { SessionCloseButton } from "./SessionCloseButton";

type Translate = ReturnType<typeof useTranslation>["t"];

/**
 * A module that owns the standard setup → session → result flow.
 *
 * @property route - Path of the module's directory, e.g. `practice/fen` or
 *   `play/ai-game`. The setup screen is `<route>/index` on the root stack;
 *   session, result and training are `<route>/<screen>` in `(session)`.
 * @property i18nKey - Namespace holding `setup.title` and `result.title`.
 * @property hasTraining - The module also has an untimed `training` screen.
 * @property sessionHeader - The timed session sits under a stack header (the
 *   module's name, and the × that asks before leaving), like its result and
 *   training screens, instead of drawing the × in its own top row. Its
 *   session renders `PracticeSessionScreen` with `headerShown`.
 */
export type ModuleRoute = {
  route: string;
  i18nKey: string;
  hasTraining?: boolean;
  sessionHeader?: boolean;
};

/**
 * The setup (description) screens, registered on the root stack so they are
 * pushed above the tab bar.
 *
 * Returns an array rather than a fragment: expo-router collects `Screen`
 * children with `React.Children.forEach`, which flattens arrays but treats a
 * fragment as one opaque element.
 */
export function moduleSetupScreens(
  t: Translate,
  modules: readonly ModuleRoute[],
) {
  // `${i18nKey}.setup.title` (i18nKey from MOBILE_PRACTICE_MODULES and PLAY_MODULES): coordinateQuiz.setup.title, legalMoves.setup.title, boardSymmetry.setup.title, squareColors.setup.title, diagonalQuiz.setup.title, routePlanner.setup.title, quadrants.setup.title, knightTour.setup.title, algebraicNotation.setup.title, fen.setup.title, aiGame.setup.title
  return modules.map(({ route, i18nKey }) => (
    <Stack.Screen
      key={`${route}/index`}
      name={`${route}/index`}
      options={{ title: t(`${i18nKey}.setup.title`) }}
    />
  ));
}

/**
 * The screens a module shows inside the full-screen `(session)` modal.
 *
 * @description
 * - `session` has a header when the module sets `sessionHeader`: the
 *   module's name, and a close button that asks first. Otherwise it has none
 *   and draws that close button next to the clock. A full-screen modal has no
 *   swipe to dismiss, so the only way out is that button.
 * - `result` has a header whose close button dismisses the modal back to
 *   the setup screen underneath. There is no back button: the session it
 *   replaced must not be re-entered.
 * - `training` (when `hasTraining`) has a header with the same close button;
 *   nothing is lost by leaving an untimed run, so it does not ask.
 */
export function moduleSessionScreens(
  t: Translate,
  modules: readonly ModuleRoute[],
) {
  // `${i18nKey}.result.title`: the same eleven namespaces as moduleSetupScreens, with .result.title
  // `practice.${i18nKey}.title` (modules with sessionHeader): practice.coordinateQuiz.title
  return modules.flatMap(({ route, i18nKey, hasTraining, sessionHeader }) => [
    <Stack.Screen
      key={`${route}/session`}
      name={`${route}/session`}
      options={
        sessionHeader
          ? {
              title: t(`practice.${i18nKey}.title`),
              headerBackVisible: false,
              gestureEnabled: false,
              headerLeft: () => <SessionCloseButton confirm />,
            }
          : { headerShown: false, gestureEnabled: false }
      }
    />,
    <Stack.Screen
      key={`${route}/result`}
      name={`${route}/result`}
      options={{
        title: t(`${i18nKey}.result.title`),
        headerBackVisible: false,
        gestureEnabled: false,
        headerLeft: () => <SessionCloseButton />,
      }}
    />,
    ...(hasTraining
      ? [
          <Stack.Screen
            key={`${route}/training`}
            name={`${route}/training`}
            options={{
              title: t("common.training"),
              headerBackVisible: false,
              headerLeft: () => <SessionCloseButton />,
            }}
          />,
        ]
      : []),
  ]);
}
