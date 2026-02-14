import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Button } from "../../../../components";
import { ResultCard } from "../../../../features/route-planner/components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type { RoutePlannerResult } from "../../../../features/route-planner/hooks";

export default function RoutePlannerResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    correctCount: string;
    totalProblems: string;
    accuracy: string;
  }>();

  const result: RoutePlannerResult = {
    problems: [],
    correctCount: parseInt(params.correctCount || "0", 10),
    totalProblems: parseInt(params.totalProblems || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
  };

  const handlePlayAgain = () => {
    router.replace("/(tabs)/practice/route-planner/setup");
  };

  const handleBackToMenu = () => {
    router.replace("/(tabs)/practice");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("routePlanner.result.title")}
        </Text>

        <ResultCard result={result} />
      </View>

      <View style={styles.footer}>
        <Button
          title={t("routePlanner.result.playAgain")}
          onPress={handlePlayAgain}
          size="lg"
          fullWidth
        />
        <Button
          title={t("routePlanner.result.backToMenu")}
          onPress={handleBackToMenu}
          variant="ghost"
          size="md"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
