import { useCallback } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { refreshAccount, signOut, useAuth } from "../../auth/use-auth";
import { openWebPage } from "../../lib/web-pages";

/**
 * The account block of the settings tab. Signing in is optional: every
 * practice works signed out; an account records challenge results on the
 * server (the web's leaderboard and EXP) and shows the user's own ranks.
 * Hidden in a build with no backend.
 *
 * It is also where a failed account load (`/me`, offline or 503 at launch)
 * recovers. Nothing else asks for the account again until the user changes,
 * so without a retry here the progress card and the way to set a username
 * stay out of reach until the next cold start. While the account is
 * missing, every focus of the tab retries, and the username row reads
 * "loading" — or "tap to retry" after a failure — instead of a blank value.
 */
export function AccountSection() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const auth = useAuth();

  const accountMissing =
    auth.status === "signedIn" && auth.account === undefined;
  useFocusEffect(
    useCallback(() => {
      if (!accountMissing) return;
      // Deferred like the auth listener's own refresh, so the request never
      // starts while supabase-js holds its auth lock. Concurrent calls share
      // one request, so overlapping with that refresh costs nothing.
      const timer = setTimeout(() => void refreshAccount(), 0);
      return () => clearTimeout(timer);
    }, [accountMissing]),
  );

  if (auth.status === "unavailable" || auth.status === "loading") return null;

  if (auth.status === "signedOut") {
    return (
      <ListSection
        title={t("settings.account.title")}
        footer={t("settings.account.signedOutNote")}
      >
        <ListRow
          leading={<ListIcon ionicon="person-circle-outline" />}
          title={t("settings.account.signIn")}
          onPress={() => router.push("/sign-in")}
          testID="settings-sign-in"
        />
      </ListSection>
    );
  }

  const username = auth.account?.username;
  return (
    <ListSection
      title={t("settings.account.title")}
      footer={t("settings.account.deleteAccountNote")}
    >
      <ListRow title={t("settings.account.email")} value={auth.email} />
      {auth.account === undefined ? (
        <ListRow
          title={t("settings.account.username")}
          value={
            auth.accountError
              ? t("settings.account.retry")
              : t("settings.account.loading")
          }
          onPress={() => void refreshAccount()}
        />
      ) : username === null ? (
        <ListRow
          title={t("settings.account.username")}
          value={t("settings.account.setUsername")}
          onPress={() => router.push("/setup-username")}
        />
      ) : (
        <ListRow title={t("settings.account.username")} value={username} />
      )}
      <ListRow
        leading={<ListIcon ionicon="trophy-outline" />}
        title={t("records.title")}
        onPress={() => router.push("/records")}
      />
      <ListRow
        title={t("settings.account.signOut")}
        accessory="none"
        onPress={() =>
          Alert.alert(t("settings.account.signOutConfirm"), undefined, [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("settings.account.signOut"),
              style: "destructive",
              onPress: () => void signOut(),
            },
          ])
        }
      />
      {/*
       * App Store Guideline 5.1.1(v): an app that lets users create an
       * account must also let them start deleting it from within the app.
       * The web already has the deletion screen and the scheduled job that
       * carries it out, so the app links there rather than adding a second,
       * destructive mobile API endpoint. The web page needs its own sign-in
       * (the browser does not share the app's session), and its layout sends
       * a user without a username to set one first — the footer says both.
       */}
      <ListRow
        title={t("settings.account.deleteAccount")}
        accessory="external"
        onPress={() => openWebPage("/mypage/delete-account", i18n.language)}
        testID="settings-delete-account"
      />
    </ListSection>
  );
}
