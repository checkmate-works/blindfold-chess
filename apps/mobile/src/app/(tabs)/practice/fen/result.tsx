import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultCard,
  PracticeResultScreen,
} from "../../../../components";
import {
  parseFenResultParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";

export default function FenResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<FenResultParams>();
  const result = parseFenResultParams(params);

  return (
    <PracticeResultScreen
      title={t("fen.result.title")}
      playAgainLabel={t("fen.result.playAgain")}
      backToMenuLabel={t("fen.result.backToMenu")}
      setupHref="/(tabs)/practice/fen/setup"
    >
      <PracticeResultCard
        scoreLabel={t("fen.result.accuracy")}
        scoreValue={`${result.accuracy.toFixed(1)}%`}
        statItems={[
          {
            label: t("fen.result.correct"),
            value: `${result.correct} / ${result.totalPieces}`,
            highlight: true,
          },
          {
            label: t("fen.result.incorrect"),
            value: String(result.incorrect),
          },
          { label: t("fen.result.missing"), value: String(result.missing) },
          { label: t("fen.result.extra"), value: String(result.extra) },
          {
            label: t("fen.result.problemDetails"),
            value: `${result.solved} / ${result.problems}`,
          },
          {
            label: t("fen.result.skipped"),
            value: String(result.problems - result.solved),
          },
        ]}
      />
    </PracticeResultScreen>
  );
}
