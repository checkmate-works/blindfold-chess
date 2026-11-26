import { useCallback, useRef, useState } from "react";
import { type Result, err, ok } from "@blindfold-chess/features/utils";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import {
  getFenAfterMoves,
  getStartingFen,
} from "@blindfold-chess/features/chess-core";

import { type EngineError, useStockfishEngine } from "../engine";
import type { SkillLevel } from "../lib/types";

// WASM base64 decoding + engine init can take several seconds
const MAX_READY_POLLS = 50;
const READY_POLL_INTERVAL = 200;

// A busy engine (a previous request still in flight) is the one failure worth
// waiting out inside a single attempt; the web's orchestration waits the same
// ten rounds of 200 ms before it gives up and offers Retry.
const MAX_BUSY_RETRIES = 10;
const BUSY_RETRY_INTERVAL = 200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAiVersus(skillLevel: SkillLevel) {
  const {
    engineState,
    engineStateRef,
    webViewRef,
    handleMessage,
    handleWebViewReady,
    handleWebViewError,
    setSkillLevel,
    getBestMove,
    reset: resetEngine,
  } = useStockfishEngine();
  const [isLoading, setIsLoading] = useState(false);
  // The skill level is an option of one engine process, so it is sent once
  // per WebView and again after `reset` replaces the page.
  const isSkillLevelSetRef = useRef(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const getAiMove = useCallback(
    async (
      moves: AlgebraicNotation[],
      startingFen?: string,
    ): Promise<Result<AlgebraicNotation, EngineError>> => {
      setIsLoading(true);

      try {
        // Wait for engine to be ready with retries (using ref for latest value)
        let polls = 0;
        while (engineStateRef.current !== "ready" && polls < MAX_READY_POLLS) {
          // An engine that failed to start will not become ready by waiting.
          if (engineStateRef.current === "error") break;
          await wait(READY_POLL_INTERVAL);
          polls++;
        }

        if (engineStateRef.current !== "ready") {
          return err({ kind: "not-ready", state: engineStateRef.current });
        }

        if (!isSkillLevelSetRef.current) {
          await setSkillLevel(skillLevel);
          isSkillLevelSetRef.current = true;
        }

        const initialFen = startingFen ?? getStartingFen();
        const fen = getFenAfterMoves(initialFen, moves);

        for (let attempt = 0; ; attempt++) {
          const result = await getBestMove(fen, moves, 1000, startingFen);
          if (result.ok) return ok(result.value.algebraicMove);
          if (result.error.kind !== "busy" || attempt >= MAX_BUSY_RETRIES) {
            return result;
          }
          await wait(BUSY_RETRY_INTERVAL);
        }
      } catch (cause) {
        // `setSkillLevel` talks to the engine too and rejects when the bridge
        // is gone; report it like any other request that never came back.
        return err({ kind: "timeout", cause });
      } finally {
        setIsLoading(false);
      }
    },
    [engineStateRef, getBestMove, setSkillLevel, skillLevel],
  );

  /**
   * Throw the engine away and boot a new one, for the Retry button after a
   * failed AI move. The screen passes `webViewKey` as the WebView's `key`, so
   * the page reloads and Stockfish starts from scratch — the mobile
   * counterpart of the web recreating its Worker.
   */
  const reset = useCallback(() => {
    resetEngine();
    isSkillLevelSetRef.current = false;
    setWebViewKey((key) => key + 1);
  }, [resetEngine]);

  return {
    getAiMove,
    isLoading,
    engineState,
    reset,
    webViewKey,
    webViewRef,
    handleMessage,
    handleWebViewReady,
    handleWebViewError,
  };
}
