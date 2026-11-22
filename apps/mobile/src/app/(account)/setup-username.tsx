import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button, TextField } from "../../components";
import { submitUsername } from "../../auth/account";
import { refreshAccount } from "../../auth/use-auth";
import { useTheme, fontSize, spacing } from "../../theme";

/** The server's error codes → `account.setupUsername.validation.*`. */
const ERROR_KEYS: Record<string, string> = {
  too_short: "tooShort",
  too_long: "tooLong",
  invalid_format: "invalidFormat",
  reserved: "reserved",
  username_taken: "taken",
  username_already_set: "alreadySet",
  username_inappropriate: "usernameInappropriate",
};

/**
 * Choosing the username (the web's `/mypage/setup-username`), once. It is
 * the account's public ID on the web — the leaderboard shows it — so the
 * screen repeats the web's warning that it cannot be changed.
 */
export default function SetupUsernameScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const code = await submitUsername(username.trim());
    if (code === null) {
      await refreshAccount();
      setBusy(false);
      navigation.getParent()?.goBack();
      return;
    }
    setBusy(false);
    // account.setupUsername.validation.{tooShort,tooLong,invalidFormat,reserved,taken,alreadySet,usernameInappropriate,error}
    setError(
      t(`account.setupUsername.validation.${ERROR_KEYS[code] ?? "error"}`),
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.body, { color: colors.foreground }]}>
        {t("account.setupUsername.description")}
      </Text>
      <TextField
        label={t("account.setupUsername.usernameLabel")}
        value={username}
        onChangeText={(text) => setUsername(text.toLowerCase())}
        placeholder={t("account.setupUsername.usernamePlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        hint={error ?? t("account.setupUsername.usernameHint")}
        error={error !== null}
        onSubmitEditing={handleSubmit}
        testID="username-input"
      />
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        {t("account.setupUsername.cannotChange")}
      </Text>
      <Button
        title={t("account.setupUsername.submit")}
        onPress={handleSubmit}
        loading={busy}
        disabled={username.trim().length < 2}
        size="lg"
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  note: {
    fontSize: fontSize.sm,
  },
});
