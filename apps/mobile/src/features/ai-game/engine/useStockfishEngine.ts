import { useCallback, useRef, useState } from "react";
import {
  buildSkillLevelCommands,
  parseUciResponse,
  buildPositionCommand,
  buildGoCommand,
} from "@blindfold-chess/features/ai-game";
import {
  movesToUci,
  uciToAlgebraic,
} from "@blindfold-chess/features/chess-core";
import type { AlgebraicNotation, Fen, UciMove } from "@blindfold-chess/types";

import type { SkillLevel } from "../lib/types";
import type { StockfishWebViewHandle } from "./StockfishWebView";

type EngineState = "idle" | "initializing" | "ready" | "error";

type PendingCallback = {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export function useStockfishEngine() {
  const webViewRef = useRef<StockfishWebViewHandle>(null);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const engineStateRef = useRef<EngineState>("idle");
  const pendingCallbacksRef = useRef<Map<string, PendingCallback>>(new Map());
  const isProcessingRef = useRef(false);

  // Keep ref in sync with state so async code can read the latest value
  const updateEngineState = useCallback((state: EngineState) => {
    engineStateRef.current = state;
    setEngineState(state);
  }, []);

  const handleMessage = useCallback((message: string) => {
    const parsed = parseUciResponse(message);
    if (!parsed) return;

    // The pending-callback map is keyed by response type, so every branch of
    // the old per-type switch was the same settle step; a fourth message type
    // now needs no copy-paste.
    const callbacks = pendingCallbacksRef.current;
    const pending = callbacks.get(parsed.type);
    if (pending) {
      callbacks.delete(parsed.type);
      clearTimeout(pending.timeoutId);
      pending.resolve(message);
    }
  }, []);

  const sendCommand = useCallback((command: string) => {
    webViewRef.current?.sendCommand(command);
  }, []);

  const waitForResponse = useCallback(
    (key: string, timeoutMs: number = 10000): Promise<string> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingCallbacksRef.current.delete(key);
          reject(new Error(`Engine command timeout waiting for: ${key}`));
        }, timeoutMs);

        pendingCallbacksRef.current.set(key, { resolve, reject, timeoutId });
      });
    },
    [],
  );

  const initializeEngine = useCallback(async () => {
    updateEngineState("initializing");

    try {
      // Send UCI command and wait for uciok
      const uciPromise = waitForResponse("uciok", 15000);
      sendCommand("uci");
      await uciPromise;

      // Send isready and wait for readyok
      const readyPromise = waitForResponse("readyok", 10000);
      sendCommand("isready");
      await readyPromise;

      updateEngineState("ready");
    } catch (error) {
      updateEngineState("error");
      throw error;
    }
  }, [sendCommand, waitForResponse, updateEngineState]);

  const handleWebViewReady = useCallback(() => {
    initializeEngine().catch((err) => {
      console.error("Engine initialization failed:", err);
    });
  }, [initializeEngine]);

  const handleWebViewError = useCallback(
    (error: string) => {
      console.error("StockfishWebView error:", error);
      updateEngineState("error");
    },
    [updateEngineState],
  );

  const setSkillLevel = useCallback(
    async (level: SkillLevel) => {
      const commands = buildSkillLevelCommands(level);
      for (const cmd of commands) {
        sendCommand(cmd);
      }

      // Wait for engine to be ready after setting options
      const readyPromise = waitForResponse("readyok", 5000);
      sendCommand("isready");
      await readyPromise;
    },
    [sendCommand, waitForResponse],
  );

  const convertMovesToUci = useCallback(
    (moves: AlgebraicNotation[], startingFen?: string): string[] => {
      return movesToUci(moves as string[], startingFen);
    },
    [],
  );

  const convertUciToAlgebraic = useCallback(
    (uciMove: UciMove, fen: Fen): AlgebraicNotation => {
      return uciToAlgebraic(uciMove, fen) as AlgebraicNotation;
    },
    [],
  );

  const getBestMove = useCallback(
    async (
      fen: Fen,
      moves: AlgebraicNotation[] = [],
      timeLimit: number = 1000,
      startingFen?: string,
    ): Promise<{ uciMove: UciMove; algebraicMove: AlgebraicNotation }> => {
      if (engineStateRef.current !== "ready") {
        throw new Error("Engine not ready");
      }

      if (isProcessingRef.current) {
        throw new Error("Engine is already processing a request");
      }

      try {
        isProcessingRef.current = true;

        const DEFAULT_START_FEN =
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        // Set position: use base FEN + moves so Stockfish replays from the start
        if (moves.length > 0) {
          const baseFen = startingFen || DEFAULT_START_FEN;
          const uciMoves = convertMovesToUci(moves, startingFen);
          sendCommand(buildPositionCommand(baseFen, uciMoves));
        } else {
          sendCommand(buildPositionCommand(fen));
        }

        // Get best move
        const bestMovePromise = waitForResponse("bestmove", timeLimit + 5000);
        sendCommand(buildGoCommand({ movetime: timeLimit }));
        const response = await bestMovePromise;

        const parsed = parseUciResponse(response);
        if (!parsed || parsed.type !== "bestmove") {
          throw new Error("Engine failed to return a move");
        }

        const uciMove = parsed.move as UciMove;

        // fen is already the current position (after all moves),
        // so use it directly for UCI-to-algebraic conversion
        const algebraicMove = convertUciToAlgebraic(uciMove, fen);

        return { uciMove, algebraicMove };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [sendCommand, waitForResponse, convertMovesToUci, convertUciToAlgebraic],
  );

  return {
    webViewRef,
    engineState,
    engineStateRef,
    handleMessage,
    handleWebViewReady,
    handleWebViewError,
    setSkillLevel,
    getBestMove,
    convertUciToAlgebraic,
  };
}
