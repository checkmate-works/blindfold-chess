import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button, TextField } from "../../components";
import { supabase } from "../../auth/supabase-client";
import {
  OAuthButtons,
  OAuthDivider,
} from "../../features/account/OAuthButtons";
import { useFinishSignIn } from "../../features/account/use-finish-sign-in";
import { openWebPage } from "../../lib/web-pages";
import { useTheme, fontSize, spacing } from "../../theme";

/**
 * Sign-in: the one-tap providers this build offers, then email (the web's
 * `/sign-in`), straight against Supabase Auth. After signing in, an account without a username goes on to choose one;
 * otherwise the modal closes. Password reset happens on the web.
 */
export default function SignInScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const finishSignIn = useFinishSignIn();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setBusy(false);
      setError(
        signInError.code === "over_request_rate_limit"
          ? t("account.signIn.rateLimited")
          : t("account.signIn.emailSignInError"),
      );
      return;
    }
    await finishSignIn();
    setBusy(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <OAuthButtons mode="signIn" />
      <OAuthDivider />
      <TextField
        label={t("account.signIn.emailLabel")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("account.signIn.emailPlaceholder")}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        testID="sign-in-email"
      />
      <TextField
        label={t("account.signIn.passwordLabel")}
        value={password}
        onChangeText={setPassword}
        placeholder={t("account.signIn.passwordPlaceholder")}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSubmit}
        testID="sign-in-password"
      />
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
      <Button
        title={t("account.signIn.emailSignIn")}
        onPress={handleSubmit}
        loading={busy}
        disabled={!email.trim() || !password}
        size="lg"
        fullWidth
      />
      <Button
        title={t("account.signIn.forgotPassword")}
        variant="ghost"
        size="sm"
        onPress={() => openWebPage("/forgot-password", i18n.language)}
      />
      <View style={styles.switchRow}>
        <Text style={{ color: colors.mutedForeground }}>
          {t("account.signIn.noAccount")}
        </Text>
        <Button
          title={t("account.signIn.signUp")}
          variant="ghost"
          size="sm"
          onPress={() => router.push("/sign-up")}
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
