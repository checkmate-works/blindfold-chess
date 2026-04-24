import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "../../../components";
import type { SquareColorsResult } from "../hooks";

type ResultCardProps = {
  result: SquareColorsResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats } = deriveResultStats(result, {
    correctAnswers: t("squareColors.result.correctAnswers"),
    accuracy: t("squareColors.result.accuracy"),
    timeTaken: t("squareColors.result.timeTaken"),
    averageTime: t("squareColors.result.averageTime"),
  });

  return (
    <PracticeResultCard
      scoreLabel={t("squareColors.result.correctAnswers")}
      scoreValue={scoreValue}
      statItems={stats}
    />
  );
}
