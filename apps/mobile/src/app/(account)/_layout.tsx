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
 * The account modal: mypage, settings, the account offer after onboarding
 * (`welcome`), sign-in, sign-up, username setup, the user's records (My
 * Records, its full results list) and their leaderboard ranks, as a
 * stack inside one modal (the root stack presents `(account)` as `modal`,
 * the iOS card sheet). Screens inside it push onto this stack without
 * closing the modal.
 *
 * Whichever screen opens the modal shows a × (`ModalCloseButton`) that
 * dismisses the whole modal; a screen pushed on top of it gets the OS back
 * chevron instead. The same screen can be either — records opens from the
 * home tab's progress card and from mypage — so the layout decides from the
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
        <Stack.Screen name="mypage" options={titled(t("mypage.title"))} />
        <Stack.Screen name="settings" options={titled(t("tabs.settings"))} />
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
        <Stack.Screen name="records" options={titled(t("records.title"))} />
        <Stack.Screen
          name="records-results"
          options={titled(t("records.results.title"))}
        />
        <Stack.Screen name="ranks" options={titled(t("ownRanks.title"))} />
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
