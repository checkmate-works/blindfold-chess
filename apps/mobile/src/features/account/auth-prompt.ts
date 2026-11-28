import { Alert } from "react-native";
import type { Href } from "expo-router";
import type { TFunction } from "i18next";

/**
 * Why the prompt is shown: no account yet, or an account without the
 * username that finishes signing up (the web's provisional user).
 */
export type AuthPromptReason = "signedOut" | "username";

/**
 * The web's `AuthPromptModal`, as the platform's own alert: what a
 * members-only action (a like) asks of a player who cannot take it yet.
 * Signed out it offers sign-up first and sign-in beside it; signed in
 * without a username, the username screen. Each choice opens the account
 * modal, which closes back onto the screen the player was on.
 *
 * An alert rather than a `BottomSheet`: the choices open a modal, and a
 * native sheet still animating away when the modal is presented can make
 * iOS refuse the second presentation. An alert is gone before its button's
 * handler runs.
 */
export function showAuthPrompt(
  reason: AuthPromptReason,
  t: TFunction,
  router: { push: (href: Href) => void },
): void {
  if (reason === "username") {
    Alert.alert(
      t("authPrompt.username.title"),
      t("authPrompt.username.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("recordCta.usernameButton"),
          isPreferred: true,
          onPress: () => router.push("/setup-username"),
        },
      ],
    );
    return;
  }
  Alert.alert(
    t("authPrompt.signedOut.title"),
    t("authPrompt.signedOut.message"),
    [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("authPrompt.signIn"),
        onPress: () => router.push("/sign-in"),
      },
      {
        text: t("recordCta.signUpButton"),
        isPreferred: true,
        onPress: () => router.push("/sign-up"),
      },
    ],
  );
}
