import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { signOut, useAuth } from "../../auth/use-auth";

/**
 * The account block of the settings tab. Signing in is optional: every
 * practice works signed out; an account records challenge results on the
 * server (the web's leaderboard and EXP) and shows the user's own ranks.
 * Hidden in a build with no backend.
 */
export function AccountSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();

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
    <ListSection title={t("settings.account.title")}>
      <ListRow title={t("settings.account.email")} value={auth.email} />
      {username === null ? (
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
    </ListSection>
  );
}
