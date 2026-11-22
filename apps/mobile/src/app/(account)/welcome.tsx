import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "../../components";
import { OAuthButtons } from "../../features/account/OAuthButtons";
import { MENTOR } from "../../features/onboarding/constants/mentor";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";

/**
 * The account offer that closes onboarding: shown once, on the home tab,
 * after the first game or practice onboarding sent the player into
 * (`useSignUpOffer`). The mentor says what an account adds — recorded
 * challenges, rank and level, the same account on the web — then the one-tap
 * providers, email, sign-in for an existing account, and "later".
 *
 * It does not promise to keep the run just played: AI games stay on the
 * device either way, and a signed-out challenge or training run is graded on
 * the device, so the server has nothing it could record for it.
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.mentor}>
        <Image
          source={MENTOR.avatar}
          style={[styles.avatar, { backgroundColor: colors.muted }]}
        />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("account.welcome.heading")}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {t("account.welcome.body")}
        </Text>
      </View>
      <OAuthButtons mode="signUp" />
      <Button
        title={t("account.welcome.signUpWithEmail")}
        variant="outline"
        size="lg"
        fullWidth
        onPress={() => router.push("/sign-up")}
      />
      <Button
        title={t("account.welcome.signIn")}
        variant="ghost"
        size="sm"
        onPress={() => router.push("/sign-in")}
      />
      <Button
        title={t("account.welcome.later")}
        variant="ghost"
        size="sm"
        onPress={() => navigation.getParent()?.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  mentor: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: "center",
  },
});
