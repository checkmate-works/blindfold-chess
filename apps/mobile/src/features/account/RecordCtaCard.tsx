import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import { Button, Card } from "../../components";
import { fontSize, fontWeight, spacing, useTheme } from "../../theme";

/**
 * The home tab's way into an account, under the next-rank card.
 *
 * Signing in is optional and the app has no standing sign-in button a guest
 * would see, so home says what an account adds to the person who has none:
 *
 * - signed out — "Sign up free" (the sign-up screen, one-tap providers
 *   first) and "Sign in" for an existing account
 * - signed in without a username — "Choose a username". Sign-up is not
 *   finished until then (the leaderboard and the web's mypage need the
 *   name), so a registered player is never asked to sign up again
 * - anyone else (a finished account, a build without accounts, the session
 *   or the account still loading, an account that failed to load) — nothing.
 *   Retrying a failed load belongs to the settings screen's account section.
 *
 * The message carries the whole point, so the card has no heading. It is a
 * flat panel; only the buttons inside are pressable.
 */
export function RecordCtaCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, account } = useAuth();

  if (status === "signedOut") {
    return (
      <CtaFrame
        message={t("home.recordCta.signUp.message")}
        description={t("home.recordCta.signUp.description")}
      >
        <Button
          title={t("home.recordCta.signUp.button")}
          size="lg"
          fullWidth
          testID="home-sign-up-cta"
          onPress={() => router.push("/sign-up")}
        />
        <Button
          title={t("home.recordCta.signIn")}
          variant="ghost"
          size="sm"
          testID="home-sign-in-cta"
          onPress={() => router.push("/sign-in")}
        />
      </CtaFrame>
    );
  }

  if (status === "signedIn" && account?.username === null) {
    return (
      <CtaFrame
        message={t("home.recordCta.username.message")}
        description={t("home.recordCta.username.description")}
      >
        <Button
          title={t("home.recordCta.username.button")}
          size="lg"
          fullWidth
          testID="home-username-cta"
          onPress={() => router.push("/setup-username")}
        />
      </CtaFrame>
    );
  }

  return null;
}

function CtaFrame({
  message,
  description,
  children,
}: {
  message: string;
  description: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.texts}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          {message}
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      </View>
      <View style={styles.actions}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  texts: {
    gap: spacing.xs,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  actions: {
    gap: spacing.xs,
    alignItems: "center",
  },
});
