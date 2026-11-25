import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { SessionResult } from "../../../../features/fen/components";
import {
  parseFenResultParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";

/**
 * Position memory's result, as the web's: the run's accuracy and recreation
 * progress, then every problem with both boards and a Lichess link.
 */
export default function PositionMemoryResult() {
  const params = useLocalSearchParams<FenResultParams>();
  const result = parseFenResultParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/position-memory">
      <SessionResult result={result} showLichess />
    </PracticeResultScreen>
  );
}
