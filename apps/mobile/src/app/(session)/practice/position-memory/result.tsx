import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PracticeResultScreen, type ResultExits } from "../../../../components";
import { ExamVerdictCard } from "../../../../features/dojo/ExamVerdictCard";
import {
  examProblemOf,
  examRankOf,
} from "@blindfold-chess/features/dojo-journey";
import { SessionResult } from "../../../../features/fen/components";
import { useReturnToGame } from "../../../../navigation/use-return-to-game";
import {
  parseFenResultParams,
  FROM_GUIDE,
  gamePositionCheckSessionParams,
  guideProblemSessionParams,
  parseFenSessionParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";

/**
 * Position memory's result, as the web's: the run's accuracy and recreation
 * progress, then every problem with both boards and a Lichess link. A dojo
 * exam run (`exam` param) leads with the verdict on its one problem — the
 * recreated position is the answer graded — and "Play again" returns to the
 * exam rather than the practice setup. A guide's problem (`from=guide`,
 * opened from a guide's link card over the guide) leads back to the guide,
 * and its "Play again" replays the same problem in place. An AI game's
 * position check (`from=game`, opened over the game) leads back to the game
 * the same way, the × included, and replays the check in place.
 */
export default function PositionMemoryResult() {
  const router = useRouter();
  const params = useLocalSearchParams<
    FenResultParams & {
      exam?: string;
      from?: string;
      problems?: string;
      seconds?: string;
      start?: string;
    }
  >();
  const backToGame = useReturnToGame({ from: params.from });
  const result = parseFenResultParams(params);
  const exam = examRankOf(params.exam);
  const problem = examProblemOf(params.exam, "position_memory");
  // A skipped problem has no recreation; the empty answer grades as a fail.
  const recreatedFen = result.results[0]?.recreatedFen ?? "";
  const guideProblems = !exam && params.from === FROM_GUIDE && params.problems;
  const gameProblem =
    !exam && backToGame
      ? parseFenSessionParams({ problems: params.problems }).fens[0]
      : undefined;
  const exits: ResultExits = exam
    ? { kind: "exam" }
    : backToGame && gameProblem
      ? {
          kind: "game",
          onBackToGame: backToGame,
          onPlayAgain: () =>
            router.replace({
              pathname: "/practice/position-memory/session",
              params: gamePositionCheckSessionParams({
                fen: gameProblem,
                startFen: params.start,
              }),
            }),
        }
      : guideProblems
        ? {
            kind: "guide",
            onPlayAgain: () =>
              router.replace({
                pathname: "/practice/position-memory/session",
                params: guideProblemSessionParams(
                  parseFenSessionParams({ problems: guideProblems }).fens,
                  params.seconds,
                ),
              }),
          }
        : { kind: "menu" };

  return (
    <PracticeResultScreen
      setupHref={
        exam ? (`/dojo/exams/${exam}` as Href) : "/practice/position-memory"
      }
      exits={exits}
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
