import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function SquareColorsResult() {
  const params = useLocalSearchParams<
    PracticeStatsParams & { attemptId?: string; interrupted?: string }
  >();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/square-colors">
      <PracticeStatsResultCard result={result} />
      <ChallengeRecordStatus
        attemptId={params.attemptId}
        interrupted={params.interrupted === "1"}
      />
    </PracticeResultScreen>
  );
}
