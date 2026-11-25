import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function BoardSymmetryResult() {
  const params = useLocalSearchParams<
    PracticeStatsParams & { attemptId?: string }
  >();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/board-symmetry">
      <PracticeStatsResultCard result={result} />
      <ChallengeRecordStatus attemptId={params.attemptId} />
    </PracticeResultScreen>
  );
}
