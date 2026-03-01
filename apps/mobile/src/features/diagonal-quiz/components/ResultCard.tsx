import { useTranslation } from "react-i18next";
import { PracticeResultCard } from "../../../components";
import type { DiagonalQuizResult } from "../hooks";

type ResultCardProps = {
  result: DiagonalQuizResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t("diagonalQuiz.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("diagonalQuiz.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("diagonalQuiz.result.timeTaken"),
      value: `${result.timeTaken}s`,
    },
    {
      label: t("diagonalQuiz.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <PracticeResultCard
      scoreLabel={t("diagonalQuiz.result.correctAnswers")}
      scoreValue={`${result.correctAnswers} / ${result.totalQuestions}`}
      statItems={statItems}
    />
  );
}
