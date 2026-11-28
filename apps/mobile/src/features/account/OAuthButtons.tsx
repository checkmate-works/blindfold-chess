import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTranslation } from "react-i18next";

import { OAUTH_PROVIDERS, signInWith } from "../../auth/oauth";
import type { OAuthProvider } from "../../auth/oauth-providers";
import {
  useTheme,
  borderRadius,
  controlLabel,
  fontSize,
  spacing,
} from "../../theme";
import { GoogleLogo } from "./GoogleLogo";
import { useFinishSignIn } from "./use-finish-sign-in";

/** The height of Apple's button, matched by the Google one beside it. */
const BUTTON_HEIGHT = 50;

/** The web button's 20px "G". */
const GOOGLE_LOGO_SIZE = 20;

/**
 * One-tap sign-in buttons — Sign in with Apple (iOS) and Google — for the
 * providers this build offers (`OAUTH_PROVIDERS`); renders nothing when it
 * offers none. Signing in and signing up are the same action here: the first
 * sign-in creates the account, and `useFinishSignIn` then asks for the
 * username. Apple's button is Apple's own component, as its guidelines
 * require. Google's is drawn to stand beside it as the web's does: the
 * four-colour "G" before the label, on the card fill inside a panel border,
 * with Apple's height and corner.
 *
 * `mode` only picks the wording — the web's "Sign in with Google" or
 * "Register with Google", and Apple's matching button text.
 */
export function OAuthButtons({ mode }: { mode: "signIn" | "signUp" }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const finishSignIn = useFinishSignIn();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [failed, setFailed] = useState(false);

  if (OAUTH_PROVIDERS.length === 0) return null;

  const start = async (provider: OAuthProvider) => {
    if (busy) return;
    setBusy(provider);
    setFailed(false);
    const result = await signInWith(provider);
    if (result === "signedIn") {
      await finishSignIn();
    } else if (result === "failed") {
      setFailed(true);
    }
    setBusy(null);
  };

  return (
    <View style={styles.container}>
      {OAUTH_PROVIDERS.map((provider) =>
        provider === "apple" ? (
          <AppleAuthentication.AppleAuthenticationButton
            key={provider}
            buttonType={
              mode === "signIn"
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            }
            buttonStyle={
              isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={borderRadius.lg}
            style={styles.appleButton}
            onPress={() => void start("apple")}
          />
        ) : (
          <Pressable
            key={provider}
            onPress={() => void start("google")}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityState={{
              disabled: busy !== null,
              busy: busy === "google",
            }}
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.panelBorder,
              },
            ]}
          >
            {busy === "google" ? (
              <ActivityIndicator color={colors.foreground} size="small" />
            ) : (
              <GoogleLogo size={GOOGLE_LOGO_SIZE} />
            )}
            <Text style={[styles.googleLabel, { color: colors.foreground }]}>
              {/* account.signIn.googleOAuth, account.signUp.googleOAuth */}
              {t(`account.${mode}.googleOAuth`)}
            </Text>
          </Pressable>
        ),
      )}
      {failed && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {/* account.signIn.authError, account.signUp.authError */}
          {t(`account.${mode}.authError`)}
        </Text>
      )}
    </View>
  );
}

/** "or" between the one-tap buttons and the email form; hidden with them. */
export function OAuthDivider() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (OAUTH_PROVIDERS.length === 0) return null;
  return (
    <View style={styles.divider}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>
        {t("account.signIn.orDivider")}
      </Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  appleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  googleLabel: {
    ...controlLabel,
    flexShrink: 1,
    textAlign: "center",
  },
  error: {
    fontSize: fontSize.sm,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
