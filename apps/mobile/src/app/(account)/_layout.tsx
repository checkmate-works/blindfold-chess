import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderTextButton } from "../../navigation/HeaderTextButton";
import { useStackScreenOptions } from "../../navigation/stack-options";

/**
 * Sign-in, sign-up, username setup and the user's records: a stack inside
 * one modal (the root stack presents `(account)` as `modal`, the iOS card
 * sheet). Each screen's header has a Close button that dismisses the whole
 * modal; moving between sign-in and sign-up stays inside it.
 */
export default function AccountLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  const close = { headerLeft: () => <HeaderTextButton dismiss /> };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="sign-in"
        options={{ title: t("account.signIn.title"), ...close }}
      />
      <Stack.Screen
        name="sign-up"
        options={{ title: t("account.signUp.title") }}
      />
      <Stack.Screen
        name="setup-username"
        options={{ title: t("account.setupUsername.title"), ...close }}
      />
      <Stack.Screen
        name="records"
        options={{ title: t("records.title"), ...close }}
      />
    </Stack>
  );
}
