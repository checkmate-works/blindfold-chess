import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { ExamVerdictCard } from "../../../../features/dojo/ExamVerdictCard";
import {
  examProblemOf,
  examRankOf,
} from "@blindfold-chess/features/dojo-journey";
import { SessionResult } from "../../../../features/fen/components";
import {
  parseFenResultParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";

/**
 * Position memory's result, as the web's: the run's accuracy and recreation
 * progress, then every problem with both boards and a Lichess link. A dojo
 * exam run (`exam` param) leads with the verdict on its one problem — the
 * recreated position is the answer graded — and "Play again" returns to the
 * exam rather than the practice setup.
 */
export default function PositionMemoryResult() {
  const params = useLocalSearchParams<FenResultParams & { exam?: string }>();
  const result = parseFenResultParams(params);
  const exam = examRankOf(params.exam);
  const problem = examProblemOf(params.exam, "position_memory");
  // A skipped problem has no recreation; the empty answer grades as a fail.
  const recreatedFen = result.results[0]?.recreatedFen ?? "";

  return (
    <PracticeResultScreen
      setupHref={
        exam ? (`/dojo/exams/${exam}` as Href) : "/practice/position-memory"
      }
      hideBackToMenu={Boolean(exam)}
    >
      {exam && problem && (
        <ExamVerdictCard
          exam={exam}
          kind="position_memory"
          problem={problem}
          answer={{ fen: recreatedFen }}
        />
      )}
      <SessionResult result={result} showLichess />
    </PracticeResultScreen>
  );
}
