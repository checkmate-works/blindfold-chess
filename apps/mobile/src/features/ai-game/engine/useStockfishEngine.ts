import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";
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
    const callbacks = pendingCallbacksRef.current;

    if (message.includes("readyok")) {
      const pending = callbacks.get("readyok");
      if (pending) {
        callbacks.delete("readyok");
        clearTimeout(pending.timeoutId);
        pending.resolve(message);
      }
    } else if (message.includes("bestmove")) {
      const pending = callbacks.get("bestmove");
      if (pending) {
        callbacks.delete("bestmove");
        clearTimeout(pending.timeoutId);
        pending.resolve(message);
      }
    } else if (message.includes("uciok")) {
      const pending = callbacks.get("uciok");
      if (pending) {
        callbacks.delete("uciok");
        clearTimeout(pending.timeoutId);
        pending.resolve(message);
      }
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
      sendCommand(`setoption name Skill Level value ${level}`);

      if (level < 15) {
        sendCommand("setoption name UCI_LimitStrength value true");
        const targetElo = Math.max(800, 700 + level * 100);
        sendCommand(`setoption name UCI_Elo value ${targetElo}`);
      } else {
        sendCommand("setoption name UCI_LimitStrength value false");
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
      const chess = startingFen ? new Chess(startingFen) : new Chess();
      const uciMoves: string[] = [];

      for (const move of moves) {
        try {
          const result = chess.move(move);
          if (result) {
            uciMoves.push(result.from + result.to + (result.promotion || ""));
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      return uciMoves;
    },
    [],
  );

  const convertUciToAlgebraic = useCallback(
    (uciMove: UciMove, fen: Fen): AlgebraicNotation => {
      const chess = new Chess(fen);
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.slice(4);

      const result = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      return result.san as AlgebraicNotation;
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
          sendCommand(`position fen ${baseFen} moves ${uciMoves.join(" ")}`);
        } else {
          sendCommand(`position fen ${fen}`);
        }

        // Get best move
        const bestMovePromise = waitForResponse("bestmove", timeLimit + 5000);
        sendCommand(`go movetime ${timeLimit}`);
        const response = await bestMovePromise;

        const match = response.match(/bestmove (\w+)/);
        if (!match) {
          throw new Error("Engine failed to return a move");
        }

        const uciMove = match[1] as UciMove;

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
