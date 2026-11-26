import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderIconButton } from "../../../navigation/HeaderIconButton";
import { TabStack } from "../../../navigation/stack-options";

/**
 * The home tab's stack. Its header carries the gear into settings, which
 * has no tab of its own (see `app/settings/index.tsx`).
 */
export default function Layout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <TabStack
      titleKey="tabs.home"
      headerRight={() => (
        <HeaderIconButton
          icon="settings-outline"
          accessibilityLabel={t("tabs.settings")}
          onPress={() => router.push("/settings")}
          testID="home-settings"
        />
      )}
    />
  );
}
