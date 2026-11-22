import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { ALL_MODULE_ROUTES } from "../../navigation/module-routes";
import { moduleSessionScreens } from "../../navigation/module-stack-screens";
import { useStackScreenOptions } from "../../navigation/stack-options";

/**
 * The stack inside the full-screen session modal: timed sessions, their
 * results and training runs. The root stack presents this whole group as
 * one `fullScreenModal`, so moving from a session to its result is a
 * `replace` inside the modal and never shows the setup screen in between.
 */
export default function SessionLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      {moduleSessionScreens(t, ALL_MODULE_ROUTES)}
    </Stack>
  );
}
