import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

import { ModalCloseButton } from "../../navigation/ModalCloseButton";
import { ModalGrabber } from "../../navigation/ModalGrabber";
import { useStackScreenOptions } from "../../navigation/stack-options";

/** The function form of a screen's `options`. */
type ScreenOptionsFn = Extract<
  ComponentProps<typeof Stack.Screen>["options"],
  (...args: never[]) => unknown
>;

/**
 * The account modal: the account offer after onboarding (`welcome`),
 * sign-in, sign-up and username setup, as a stack inside one modal (the
 * root stack presents `(account)` as `modal`, the iOS card sheet). Each is
 * a task that ends where it began — signing in closes the modal back onto
 * the screen that opened it (`useFinishSignIn`) — so it fits a modal. The
 * account's pages that lead elsewhere (mypage, settings, My Records, ranks)
 * are pushed on the root stack instead; see `app/_layout.tsx`.
 *
 * Whichever screen opens the modal shows a × (`ModalCloseButton`) that
 * dismisses the whole modal; a screen pushed on top of it gets the OS back
 * chevron instead. The same screen can be either — sign-up opens from
 * mypage's card and from sign-in's link — so the layout decides from the
 * screen's place in the stack rather than per screen.
 *
 * The modal also closes on a drag down (iOS), which `ModalGrabber` shows at
 * its top edge over every screen of the stack.
 */
export default function AccountLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  const titled =
    (title: string): ScreenOptionsFn =>
    ({ route, navigation }) =>
      navigation.getState().routes[0]?.key === route.key
        ? { title, headerLeft: () => <ModalCloseButton /> }
        : { title };
  return (
    <View style={styles.root}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="welcome"
          options={titled(t("account.welcome.title"))}
        />
        <Stack.Screen
          name="sign-in"
          options={titled(t("account.signIn.title"))}
        />
        <Stack.Screen
          name="sign-up"
          options={titled(t("account.signUp.title"))}
        />
        <Stack.Screen
          name="setup-username"
          options={titled(t("account.setupUsername.title"))}
        />
      </Stack>
      <ModalGrabber />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
