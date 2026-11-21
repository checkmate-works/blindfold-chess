import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button, TextField } from "../../components";
import { callMobileApi, errorCodeOf } from "../../auth/api-client";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";

/** Mirrors the web's `MIN_PASSWORD_LENGTH`; the server checks it again. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Email sign-up (the web's `/sign-up`), through the mobile API so the web's
 * rate limit, password rules and confirmation link apply. Afterwards the
 * screen shows the web's "check your email" text; the user confirms in the
 * browser and comes back to sign in.
 */
export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    if (password !== confirm) {
      setError(t("account.signUp.passwordMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    const response = await callMobileApi("/sign-up", {
      method: "POST",
      body: { email: email.trim(), password },
      anonymous: true,
    });
    setBusy(false);
    if (typeof response !== "string" && response.ok) {
      setSent(true);
      return;
    }
    const code =
      typeof response === "string" ? response : await errorCodeOf(response);
    // account.validation.password.{tooShort,missingLetter,missingDigit,weak}
    if (code?.startsWith("password:")) {
      setError(
        t(`account.validation.password.${code.slice("password:".length)}`, {
          minLength: MIN_PASSWORD_LENGTH,
        }),
      );
    } else if (code === "rateLimited") {
      setError(t("account.signUp.rateLimited"));
    } else {
      setError(t("account.signUp.emailSignUpError"));
    }
  };

  if (sent) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("account.verifyEmail.title")}
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          {t("account.verifyEmail.description")}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {t("account.verifyEmail.checkInbox")}
          {"\n"}
          {t("account.verifyEmail.checkSpam")}
        </Text>
        <Button
          title={t("account.signUp.signIn")}
          onPress={() => router.back()}
          size="lg"
          fullWidth
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {t("account.signUp.description")}
      </Text>
      <TextField
        label={t("account.signUp.emailLabel")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("account.signUp.emailPlaceholder")}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
      />
      <TextField
        label={t("account.signUp.passwordLabel")}
        value={password}
        onChangeText={setPassword}
        placeholder={t("account.signUp.passwordPlaceholder")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label={t("account.signUp.confirmPasswordLabel")}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t("account.signUp.confirmPasswordPlaceholder")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
      <Button
        title={t("account.signUp.emailSignUp")}
        onPress={handleSubmit}
        loading={busy}
        disabled={!email.trim() || !password || !confirm}
        size="lg"
        fullWidth
      />
      <View style={styles.switchRow}>
        <Text style={{ color: colors.mutedForeground }}>
          {t("account.signUp.alreadyHaveAccount")}
        </Text>
        <Button
          title={t("account.signUp.signIn")}
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  error: {
    fontSize: fontSize.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
});
