import { useCallback, useState } from "react";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import {
  getFenAfterMoves,
  getStartingFen,
} from "@blindfold-chess/features/chess-core";

import { useStockfishEngine } from "../engine";
import type { SkillLevel } from "../lib/types";

// WASM base64 decoding + engine init can take several seconds
const MAX_RETRIES = 50;
const RETRY_INTERVAL = 200;

export function useAiVersus(skillLevel: SkillLevel) {
  const engine = useStockfishEngine();
  const [isLoading, setIsLoading] = useState(false);
  const [isSkillLevelSet, setIsSkillLevelSet] = useState(false);

  const ensureSkillLevel = useCallback(async () => {
    if (engine.engineStateRef.current !== "ready") return;
    if (isSkillLevelSet) return;

    await engine.setSkillLevel(skillLevel);
    setIsSkillLevelSet(true);
  }, [engine, skillLevel, isSkillLevelSet]);

  const getAiMove = useCallback(
    async (
      moves: AlgebraicNotation[],
      startingFen?: string,
    ): Promise<AlgebraicNotation> => {
      setIsLoading(true);

      try {
        // Wait for engine to be ready with retries (using ref for latest value)
        let retries = 0;
        while (
          engine.engineStateRef.current !== "ready" &&
          retries < MAX_RETRIES
        ) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
          retries++;
        }

        if (engine.engineStateRef.current !== "ready") {
          throw new Error("Engine not ready after retries");
        }

        await ensureSkillLevel();

        // Calculate current FEN
        const initialFen = startingFen ?? getStartingFen();
        const fen = getFenAfterMoves(initialFen, moves);

        const result = await engine.getBestMove(fen, moves, 1000, startingFen);
        return result.algebraicMove;
      } finally {
        setIsLoading(false);
      }
    },
    [engine, ensureSkillLevel],
  );

  return {
    getAiMove,
    isLoading,
    engineState: engine.engineState,
    webViewRef: engine.webViewRef,
    handleMessage: engine.handleMessage,
    handleWebViewReady: engine.handleWebViewReady,
    handleWebViewError: engine.handleWebViewError,
  };
}
