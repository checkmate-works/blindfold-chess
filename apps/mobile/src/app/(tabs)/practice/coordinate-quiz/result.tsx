import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { ResultCard } from "../../../../features/coordinate-quiz/components";
import type { QuizResult } from "../../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizResult() {
  const { t } = useTranslation();
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

  return (
    <PracticeResultScreen
      title={t("coordinateQuiz.result.title")}
      playAgainLabel={t("coordinateQuiz.result.playAgain")}
      backToMenuLabel={t("coordinateQuiz.result.backToMenu")}
      setupHref="/(tabs)/practice/coordinate-quiz/setup"
    >
      <ResultCard result={result} />
    </PracticeResultScreen>
  );
}
