import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Button, Card, Screen } from "../../components";
import { useTheme, fontSize, fontWeight, spacing, shadows } from "../../theme";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

export default function HomeTab() {
  const { t } = useTranslation();
  const { clearStatus } = useOnboardingStatus();
  const router = useRouter();
  const { colors } = useTheme();

  const handlePlayAi = () => {
    router.push("/(tabs)/play/ai-game/setup");
  };

  const handleReplayOnboarding = () => {
    router.push("/onboarding");
  };

  const handleResetOnboarding = async () => {
    await clearStatus();
    router.replace("/");
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("home.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t("home.welcome")}
          </Text>
        </View>

        {/* Play vs AI Card */}
        <Card style={styles.quickStartCard} padding="lg">
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {t("aiGame.title")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.mutedForeground }]}
          >
            {t("aiGame.description")}
          </Text>
          <Button
            title={t("home.playAi")}
            onPress={handlePlayAi}
            size="md"
            fullWidth
          />
        </Card>

        {/* Replay Onboarding */}
        <Button
          title={t("home.replayOnboarding")}
          onPress={handleReplayOnboarding}
          variant="ghost"
          size="sm"
        />

        {/* Debug Section (hidden in production) */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Button
              title="Reset Onboarding (Debug)"
              onPress={handleResetOnboarding}
              variant="outline"
              size="sm"
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
  },
  quickStartCard: {
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  debugSection: {
    marginTop: spacing.xxl,
    alignItems: "center",
  },
});
