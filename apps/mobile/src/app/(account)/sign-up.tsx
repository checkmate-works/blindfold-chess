import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { TextInputInstance } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button, TextField } from "../../components";
import { callMobileApi, errorCodeOf } from "../../auth/api-client";
import {
  OAuthButtons,
  OAuthDivider,
} from "../../features/account/OAuthButtons";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";

/**
 * The shortest password the server accepts: the web's `MIN_PASSWORD_LENGTH`
 * and Supabase's "Minimum password length" setting, both 6. The app does not
 * check it itself — the server rejects a short password with
 * `password:tooShort` — so this only fills `{{minLength}}` in the placeholder
 * and that error, and must change together with the web and Supabase.
 */
const MIN_PASSWORD_LENGTH = 6;

/**
 * Sign-up. The one-tap providers come first: they finish inside the app,
 * where email sign-up sends the user to their mailbox and back.
 *
 * Email sign-up (the web's `/sign-up`), through the mobile API so the web's
 * rate limit, password rules and confirmation link apply. Afterwards the
 * screen shows the web's "check your email" text; the user confirms in the
 * browser and comes back to sign in.
 *
 * "Sign in" goes back when sign-up was pushed from sign-in. Opened any other
 * way — first in the account modal from the home tab's card, or pushed from
 * mypage's — going back would close the modal or land on mypage, so it
 * replaces this screen with sign-in instead.
 */
export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const state = useNavigation().getState();
  const cameFromSignIn =
    state !== undefined && state.routes[state.index - 1]?.name === "sign-in";
  const toSignIn = () =>
    cameFromSignIn ? router.back() : router.replace("/sign-in");

  const handleSubmit = async () => {
    if (busy || !email.trim() || !password || !confirm) return;
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
          onPress={toSignIn}
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
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
    >
      <OAuthButtons mode="signUp" />
      <OAuthDivider />
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {t("account.signUp.description")}
      </Text>
      <TextField
        label={t("account.signUp.emailLabel")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("account.signUp.emailPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
      />
      <TextField
        label={t("account.signUp.passwordLabel")}
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        placeholder={t("account.signUp.passwordPlaceholder", {
          minLength: MIN_PASSWORD_LENGTH,
        })}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        label={t("account.signUp.confirmPasswordLabel")}
        ref={confirmRef}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t("account.signUp.confirmPasswordPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.destructive }]}
        >
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
          onPress={toSignIn}
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
