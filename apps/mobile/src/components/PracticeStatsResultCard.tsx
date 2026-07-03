import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import type { BasePracticeResult } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "./PracticeResultCard";

type PracticeStatsResultCardProps = {
  result: BasePracticeResult;
  /**
   * Overrides the "time taken" stat label for features whose translation
   * diverges from the shared `practiceResult.timeTaken` string.
   */
  timeTakenLabel?: string;
};

export function PracticeStatsResultCard({
  result,
  timeTakenLabel,
}: PracticeStatsResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats } = deriveResultStats(result, {
    correctAnswers: t("practiceResult.correctAnswers"),
    accuracy: t("practiceResult.accuracy"),
    timeTaken: timeTakenLabel ?? t("practiceResult.timeTaken"),
    averageTime: t("practiceResult.averageTime"),
  });

  return (
    <PracticeResultCard
      scoreLabel={t("practiceResult.correctAnswers")}
      scoreValue={scoreValue}
      statItems={stats}
    />
  );
}
