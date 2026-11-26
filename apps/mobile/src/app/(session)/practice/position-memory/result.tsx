import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { ExamVerdictCard } from "../../../../features/dojo/ExamVerdictCard";
import { examFor } from "../../../../features/dojo/exams";
import { SessionResult } from "../../../../features/fen/components";
import {
  parseFenResultParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";

/**
 * Position memory's result, as the web's: the run's accuracy and recreation
 * progress, then every problem with both boards and a Lichess link. A dojo
 * exam run (`exam` param) leads with the verdict, and "Play again" returns
 * to the exam rather than the practice setup.
 */
export default function PositionMemoryResult() {
  const params = useLocalSearchParams<FenResultParams & { exam?: string }>();
  const result = parseFenResultParams(params);
  const exam = params.exam ? examFor(params.exam) : undefined;

  return (
    <PracticeResultScreen
      setupHref={
        exam
          ? (`/dojo/exams/${exam.rank}` as Href)
          : "/practice/position-memory"
      }
    >
      {exam && <ExamVerdictCard exam={exam} result={result} />}
      <SessionResult result={result} showLichess />
    </PracticeResultScreen>
  );
}
