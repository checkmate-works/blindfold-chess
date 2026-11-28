import { useEffect, useRef, useState } from "react";
import type { ExpInfo } from "@blindfold-chess/features/exp";
import {
  computeGameStats,
  type MoveOperationLog,
} from "@blindfold-chess/features/game-record";

import { useAuth } from "../../../auth/use-auth";
import { saveAiGameResult } from "../game-result-api";
import type { PlayerResult, SkillLevel } from "../lib/types";

type UseAiGameExpGrantProps = {
  gameId: string;
  /** The player's result once the game is over; null while it is played. */
  result: PlayerResult | null;
  skillLevel: SkillLevel;
  operationLogs: MoveOperationLog[];
};

/**
 * Reports a finished AI game of a signed-in player for its Exp, as the web
 * does, and returns the grant once the server answers.
 *
 * Sent once, as soon as the game ends, whatever the player does next: the
 * finish sheet makes every next step optional, so the report cannot wait
 * for one of them. The server grants once per game id, so a repeat would
 * only return the same grant. A game in which the player made no move of
 * their own earns nothing and is not sent.
 */
export function useAiGameExpGrant({
  gameId,
  result,
  skillLevel,
  operationLogs,
}: UseAiGameExpGrantProps): ExpInfo | null {
  const auth = useAuth();
  const [exp, setExp] = useState<ExpInfo | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !result || auth.status !== "signedIn") return;
    const stats = computeGameStats(operationLogs);
    if (stats.totalMoves <= 0) return;
    sent.current = true;
    void saveAiGameResult({
      gameId,
      result,
      skillLevel,
      playerMoveCount: stats.totalMoves,
      aidedMoveCount: stats.aidedMoves,
    }).then(setExp);
  }, [auth.status, gameId, result, skillLevel, operationLogs]);

  return exp;
}
