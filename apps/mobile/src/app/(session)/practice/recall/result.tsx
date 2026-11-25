import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultCard,
  PracticeResultScreen,
} from "../../../../components";
import { parseIntParam } from "../../../../lib/route-params";

/** The recall summary: recall rate and how each move went. */
export default function RecallResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    total: string;
    nailed: string;
    struggled: string;
    missed: string;
    mistakes: string;
    rate: string;
  }>();
  const n = (value: string | undefined) =>
    parseIntParam(value, { fallback: 0 });

  return (
    <PracticeResultScreen setupHref="/practice/recall">
      <PracticeResultCard
        scoreLabel={t("recall.summary.rateLabel")}
        scoreValue={`${n(params.rate)}%`}
        statItems={[
          {
            label: t("recall.summary.nailed"),
            value: `${n(params.nailed)} / ${n(params.total)}`,
            highlight: true,
          },
          {
            label: t("recall.summary.struggled"),
            value: String(n(params.struggled)),
          },
          {
            label: t("recall.summary.missed"),
            value: String(n(params.missed)),
          },
          {
            label: t("recall.result.mistakes"),
            value: String(n(params.mistakes)),
          },
        ]}
      />
    </PracticeResultScreen>
  );
}
