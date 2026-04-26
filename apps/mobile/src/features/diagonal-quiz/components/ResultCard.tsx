import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "../../../components";
import type { DiagonalQuizResult } from "../hooks";

type ResultCardProps = {
  result: DiagonalQuizResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats } = deriveResultStats(result, {
    correctAnswers: t("diagonalQuiz.result.correctAnswers"),
    accuracy: t("diagonalQuiz.result.accuracy"),
    timeTaken: t("diagonalQuiz.result.timeTaken"),
    averageTime: t("diagonalQuiz.result.averageTime"),
  });

  return (
    <PracticeResultCard
      scoreLabel={t("diagonalQuiz.result.correctAnswers")}
      scoreValue={scoreValue}
      statItems={stats}
    />
  );
}
