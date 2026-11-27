import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderIconButton } from "../../../navigation/HeaderIconButton";
import { TabStack } from "../../../navigation/stack-options";

/**
 * The home tab's stack. Its header carries the person icon into mypage
 * (`(account)/mypage`), the one entry to the account, the user's records and
 * settings, as in the mahjong app. Settings has no tab of its own and is
 * reached from mypage.
 */
export default function Layout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <TabStack
      titleKey="tabs.home"
      headerRight={() => (
        <HeaderIconButton
          icon="person-circle-outline"
          accessibilityLabel={t("mypage.title")}
          onPress={() => router.push("/mypage")}
          testID="home-mypage"
        />
      )}
    />
  );
}
