import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Button } from "../../../../components";
import { ResultCard } from "../../../../features/board-symmetry/components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type { BoardSymmetryResult } from "../../../../features/board-symmetry/hooks";

export default function BoardSymmetryResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    correctAnswers: string;
    incorrectAnswers: string;
    totalQuestions: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
  }>();

  const result: BoardSymmetryResult = {
    correctAnswers: parseInt(params.correctAnswers || "0", 10),
    incorrectAnswers: parseInt(params.incorrectAnswers || "0", 10),
    totalQuestions: parseInt(params.totalQuestions || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
    timeTaken: parseInt(params.timeTaken || "0", 10),
    averageTime: parseFloat(params.averageTime || "0"),
  };

  const handlePlayAgain = () => {
    router.replace("/(tabs)/practice/board-symmetry/setup");
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
          {t("boardSymmetry.result.title")}
        </Text>

        <ResultCard result={result} />
      </View>

      <View style={styles.footer}>
        <Button
          title={t("boardSymmetry.result.playAgain")}
          onPress={handlePlayAgain}
          size="lg"
          fullWidth
        />
        <Button
          title={t("boardSymmetry.result.backToMenu")}
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
