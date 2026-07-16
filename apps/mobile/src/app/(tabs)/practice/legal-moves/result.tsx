import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function LegalMovesResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      title={t("legalMoves.result.title")}
      playAgainLabel={t("legalMoves.result.playAgain")}
      backToMenuLabel={t("legalMoves.result.backToMenu")}
      setupHref="/(tabs)/practice/legal-moves/setup"
    >
      <PracticeStatsResultCard result={result} />
    </PracticeResultScreen>
  );
}
