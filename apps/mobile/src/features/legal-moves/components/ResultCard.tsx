import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "../../../components";
import type { LegalMovesResult } from "../hooks";

type ResultCardProps = {
  result: LegalMovesResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats } = deriveResultStats(result, {
    correctAnswers: t("legalMoves.result.correctAnswers"),
    accuracy: t("legalMoves.result.accuracy"),
    timeTaken: t("legalMoves.result.timeTaken"),
    averageTime: t("legalMoves.result.averageTime"),
  });

  return (
    <PracticeResultCard
      scoreLabel={t("legalMoves.result.correctAnswers")}
      scoreValue={scoreValue}
      statItems={stats}
    />
  );
}
