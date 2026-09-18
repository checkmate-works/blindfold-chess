import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChessEngine,
  EngineBusyError,
  EngineNoMoveError,
} from "@blindfold-chess/features/ai-game/engine";
import { type Result, err, ok } from "@blindfold-chess/features/utils";
import type { AlgebraicNotation, Fen, UciMove } from "@blindfold-chess/types";

import type { SkillLevel } from "../lib/types";
import type { EngineError } from "./engine-errors";
import type { StockfishWebViewHandle } from "./StockfishWebView";
import {
  createWebViewMessageChannel,
  type WebViewUciMessageChannel,
} from "./webview-message-channel";

/** A move the engine chose, in both notations the callers need. */
export type BestMove = { uciMove: UciMove; algebraicMove: AlgebraicNotation };

type EngineState = "idle" | "initializing" | "ready" | "error";

/**
 * How long we wait for `bestmove` past the search budget we asked for.
 *
 * `go movetime N` is a promise Stockfish keeps approximately: it checks the
 * clock between search iterations, so it overruns by whatever the iteration
 * in flight had left, and on a phone the reply then has to cross the WebView
 * bridge as a `postMessage` the JS thread has to get around to. A deadline of
 * exactly N would therefore fire on a healthy engine that is merely finishing
 * up, turning every slow move into a spurious failure. Five seconds is far
 * more than that overrun needs and still bounds the wait, so the deadline
 * scales with the budget instead of being a flat number that a longer search
 * would walk straight through.
 */
const BEST_MOVE_GRACE_MS = 5000;

export function useStockfishEngine() {
  const webViewRef = useRef<StockfishWebViewHandle>(null);
  const channelRef = useRef<WebViewUciMessageChannel | null>(null);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const engineStateRef = useRef<EngineState>("idle");

  // The UCI conversation — handshake, pending resolvers, per-command
  // deadlines, init retries, failing every awaiter when the bridge dies —
  // belongs to the shared engine. This hook only adapts it to React: it owns
  // the WebView ref, the channel the engine talks through, and the
  // `engineState` the screen renders.
  const engineRef = useRef<ChessEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ChessEngine(
      () => {
        // A fresh channel per init attempt, as `ChessEngine` expects. On this
        // platform that does not restart the WebView (the screen owns it) —
        // it re-subscribes and repeats the `uci` handshake over the page that
        // is already running.
        const channel = createWebViewMessageChannel(() => webViewRef.current);
        channelRef.current = channel;
        return channel;
      },
      {
        bestMoveTimeoutMs: (searchTimeMs) => searchTimeMs + BEST_MOVE_GRACE_MS,
      },
    );
  }
  const engine = engineRef.current;

  // Keep ref in sync with state so async code can read the latest value
  const updateEngineState = useCallback((state: EngineState) => {
    engineStateRef.current = state;
    setEngineState(state);
  }, []);

  const handleMessage = useCallback((message: string) => {
    channelRef.current?.deliverMessage(message);
  }, []);

  const handleWebViewReady = useCallback(() => {
    updateEngineState("initializing");
    engine.initialize().then(
      () => updateEngineState("ready"),
      (error: unknown) => {
        console.error("Engine initialization failed:", error);
        updateEngineState("error");
      },
    );
  }, [engine, updateEngineState]);

  const handleWebViewError = useCallback(
    (error: string) => {
      // Hand the failure to the transport so every in-flight command rejects
      // now. Left alone they would each run out their own deadline and report
      // a timeout, so the screen would sit through a whole `bestmove` wait
      // after the bridge was already gone.
      channelRef.current?.deliverError(new Error(error));

      // While initializing, the retry loop owns the outcome: it will open a
      // new channel, try the handshake again, and settle on `ready` or
      // `error` through `handleWebViewReady`'s continuation. Deciding here
      // would race it.
      if (engineStateRef.current === "initializing") return;

      // Otherwise nothing is watching. Drop the dead transport so the engine
      // does not believe it is still initialized, and report the failure.
      void engine.destroy();
      updateEngineState("error");
    },
    [engine, updateEngineState],
  );

  const setSkillLevel = useCallback(
    async (level: SkillLevel) => {
      await engine.setSkillLevel(level);
    },
    [engine],
  );

  const getBestMove = useCallback(
    async (
      fen: Fen,
      moves: AlgebraicNotation[] = [],
      timeLimit: number = 1000,
      startingFen?: string,
    ): Promise<Result<BestMove, EngineError>> => {
      if (engineStateRef.current !== "ready") {
        return err({ kind: "not-ready", state: engineStateRef.current });
      }

      try {
        const uciMove = await engine.getBestMove(
          fen,
          moves,
          timeLimit,
          startingFen,
        );

        // `fen` is already the position after every move in `moves`, so it is
        // the board the returned move has to be read against.
        const algebraicMove = engine.convertUciToAlgebraic(uciMove, fen);

        return ok({ uciMove, algebraicMove });
      } catch (cause) {
        if (cause instanceof EngineBusyError) {
          return err({ kind: "busy" });
        }
        if (cause instanceof EngineNoMoveError) {
          return err({ kind: "no-move" });
        }
        // What is left is a command that missed its deadline, a bridge that
        // died mid-request, or a move that is illegal in `fen` and so failed
        // the UCI -> SAN conversion.
        return err({ kind: "timeout", cause });
      }
    },
    [engine],
  );

  useEffect(() => {
    return () => {
      // The screen is going away; so is the WebView it renders. Tear the
      // engine down rather than leaving a `bestmove` timer running against a
      // bridge that no longer has anything on the other end.
      void engine.destroy();
    };
  }, [engine]);

  return {
    webViewRef,
    engineState,
    engineStateRef,
    handleMessage,
    handleWebViewReady,
    handleWebViewError,
    setSkillLevel,
    getBestMove,
  };
}
