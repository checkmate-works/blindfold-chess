import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Button, Card } from "../../components";
import { useTheme, fontSize, fontWeight, spacing, shadows } from "../../theme";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

export default function HomeTab() {
  const { t } = useTranslation();
  const { clearStatus } = useOnboardingStatus();
  const router = useRouter();
  const { colors } = useTheme();

  const handleStartPractice = () => {
    router.push("/(tabs)/practice");
  };

  const handleReplayOnboarding = () => {
    router.push("/onboarding");
  };

  const handleResetOnboarding = async () => {
    await clearStatus();
    router.replace("/");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
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

        {/* Quick Start Card */}
        <Card style={styles.quickStartCard} padding="lg">
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            座標クイズ
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.mutedForeground }]}
          >
            チェス盤の座標を素早く認識する力を鍛えましょう
          </Text>
          <Button
            title={t("home.startPractice")}
            onPress={handleStartPractice}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
