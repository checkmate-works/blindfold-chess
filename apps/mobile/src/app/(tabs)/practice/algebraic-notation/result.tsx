import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import { getScorePercentage } from "@blindfold-chess/features/algebraic-notation";

import {
  PracticeResultCard,
  PracticeResultScreen,
} from "../../../../components";
import { parseIntParam } from "../../../../lib/route-params";

/**
 * Score and accuracy only: the quiz is untimed, so the time stats the other
 * modules show (via `PracticeStatsResultCard`) do not exist here.
 */
export default function AlgebraicNotationResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ score: string; total: string }>();
  const total = parseIntParam(params.total, { fallback: 0 });
  const score = Math.min(parseIntParam(params.score, { fallback: 0 }), total);

  return (
    <PracticeResultScreen
      title={t("algebraicNotation.result.title")}
      playAgainLabel={t("algebraicNotation.result.playAgain")}
      backToMenuLabel={t("algebraicNotation.result.backToMenu")}
      setupHref="/(tabs)/practice/algebraic-notation/setup"
    >
      <PracticeResultCard
        scoreLabel={t("practiceResult.correctAnswers")}
        scoreValue={`${score} / ${total}`}
        statItems={[
          {
            label: t("practiceResult.accuracy"),
            value: `${getScorePercentage(score, total)}%`,
          },
        ]}
      />
    </PracticeResultScreen>
  );
}
