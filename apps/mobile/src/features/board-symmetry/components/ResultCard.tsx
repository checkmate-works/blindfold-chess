import { useTranslation } from "react-i18next";
import { PracticeResultCard } from "../../../components";
import type { BoardSymmetryResult } from "../hooks";

type ResultCardProps = {
  result: BoardSymmetryResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t("boardSymmetry.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("boardSymmetry.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("boardSymmetry.result.timeTaken"),
      value: `${result.timeTaken}s`,
    },
    {
      label: t("boardSymmetry.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <PracticeResultCard
      scoreLabel={t("boardSymmetry.result.correctAnswers")}
      scoreValue={`${result.correctAnswers} / ${result.totalQuestions}`}
      statItems={statItems}
    />
  );
}
