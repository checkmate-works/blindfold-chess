import { useTranslation } from "react-i18next";
import { PracticeResultCard } from "../../../components";
import type { SquareColorsResult } from "../hooks";

type ResultCardProps = {
  result: SquareColorsResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t("squareColors.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("squareColors.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("squareColors.result.timeTaken"),
      value: `${result.timeTaken}s`,
    },
    {
      label: t("squareColors.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <PracticeResultCard
      scoreLabel={t("squareColors.result.correctAnswers")}
      scoreValue={`${result.correctAnswers} / ${result.totalQuestions}`}
      statItems={statItems}
    />
  );
}
