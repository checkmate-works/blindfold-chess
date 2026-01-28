import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Button } from "../../../../components";
import { ResultCard } from "../../../../features/coordinate-quiz/components";
import { colors, fontSize, fontWeight, spacing } from "../../../../theme";
import type { QuizResult } from "../../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    totalQuestions: string;
    correctAnswers: string;
    accuracy: string;
    averageTime: string;
    points: string;
    timeTaken: string;
  }>();

  // Parse result from URL params
  const result: QuizResult = {
    totalQuestions: parseInt(params.totalQuestions || "0", 10),
    correctAnswers: parseInt(params.correctAnswers || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
    averageTime: parseFloat(params.averageTime || "0"),
    points: parseInt(params.points || "0", 10),
    timeTaken: parseInt(params.timeTaken || "0", 10),
  };

  const handlePlayAgain = () => {
    router.replace("/(tabs)/practice/coordinate-quiz/setup");
  };

  const handleBackToMenu = () => {
    router.replace("/(tabs)/practice");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("coordinateQuiz.result.title")}</Text>

        <ResultCard result={result} />
      </View>

      <View style={styles.footer}>
        <Button
          title={t("coordinateQuiz.result.playAgain")}
          onPress={handlePlayAgain}
          size="lg"
          fullWidth
        />
        <Button
          title={t("coordinateQuiz.result.backToMenu")}
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
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
