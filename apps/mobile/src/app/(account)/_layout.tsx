import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { ModalCloseButton } from "../../navigation/ModalCloseButton";
import { useStackScreenOptions } from "../../navigation/stack-options";

/**
 * The account offer after onboarding (`welcome`), sign-in, sign-up,
 * username setup and the user's records: a stack inside
 * one modal (the root stack presents `(account)` as `modal`, the iOS card
 * sheet). Each screen's header has a × (`ModalCloseButton`) that dismisses the whole
 * modal; moving between sign-in and sign-up stays inside it.
 */
export default function AccountLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  const close = { headerLeft: () => <ModalCloseButton /> };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="welcome"
        options={{ title: t("account.welcome.title"), ...close }}
      />
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
