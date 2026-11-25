import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function QuadrantsResult() {
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/quadrants">
      <PracticeStatsResultCard result={result} />
    </PracticeResultScreen>
  );
}
