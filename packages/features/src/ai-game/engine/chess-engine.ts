import {
  getStartingFen,
  isBlackToMoveFromFen,
  movesToUci,
  uciToAlgebraic,
} from "../../chess-core";
import type { AlgebraicNotation, Fen, UciMove } from "@blindfold-chess/types";

import { buildGoCommand, buildPositionCommand } from "../uci-protocol";
import { buildSkillLevelCommands } from "../skill-level";
import type { SkillLevel } from "../types";

import { createEvaluationAccumulator } from "./evaluation-accumulator";
import type { UciMessageChannel } from "./message-channel";
import { UciTransport } from "./uci-transport";

export type EvaluationResult = {
  /** Centipawn score from white's perspective */
  score: number;
  /** Mate in N moves (positive = white wins, negative = black wins) */
  mate?: number;
  /** Best move in UCI format */
  bestMove?: string;
};

/**
 * Stockfish reports `score` / `mate` from the side-to-move's perspective.
 * Re-express them from white's perspective (negate when black is to move) so
 * an `EvaluationResult` is orientation-independent.
 *
 * Pure — extracted from `getEvaluation` so the perspective math is testable
 * apart from the Promise / timeout / subscription plumbing.
 */
export function toWhitePerspectiveEvaluation(
  fen: Fen,
  score: number,
  mate: number | undefined,
  bestMove: string | undefined,
): EvaluationResult {
  const isWhiteToMove = !isBlackToMoveFromFen(fen);
  return {
    score: isWhiteToMove ? score : -score,
    mate: mate === undefined ? undefined : isWhiteToMove ? mate : -mate,
    bestMove,
  };
}

/**
 * Thrown by {@link ChessEngine.getBestMove} / {@link ChessEngine.getEvaluation}
 * when a request arrives while a previous one is still in flight (StrictMode
 * double-invocation, overlapping orchestration rounds). Exposed as a class —
 * rather than a bare `Error` with a well-known message — so boundary adapters
 * can recognize the busy state with `instanceof` instead of matching message
 * text: the web opponent factory maps it to `OpponentError{kind:"busy"}`,
 * which the move orchestration waits on and retries.
 */
export class EngineBusyError extends Error {
  constructor() {
    super("Engine is already processing a request");
    this.name = "EngineBusyError";
  }
}

/**
 * Thrown by {@link ChessEngine.getBestMove} when the `bestmove` request
 * settled without a move. Defensive: the awaited value is typed
 * `string | undefined` because that is what a pending-request slot can hold,
 * but today's parser only settles the slot on a `bestmove` line it could read
 * a move out of, so nothing currently takes this path. Distinct from a
 * timeout all the same — the engine answered, it just answered with nothing.
 *
 * A class rather than a bare `Error` — like {@link EngineBusyError} — so a
 * boundary adapter can separate it from a missed deadline by `instanceof`
 * instead of by matching message text. The mobile hook maps it to
 * `EngineError{kind:"no-move"}`.
 */
export class EngineNoMoveError extends Error {
  constructor() {
    super("Engine failed to return a move");
    this.name = "EngineNoMoveError";
  }
}

/**
 * Thrown by {@link ChessEngine.convertUciToAlgebraic} when the engine's UCI
 * move cannot be read as SAN in the position it was requested against —
 * because the string does not decode into squares, because the move is not
 * legal there, or because the FEN itself is unparseable. All three mean the
 * same thing to the caller: the move just produced cannot be played, so the
 * round has to fail instead of advancing the game.
 *
 * A class rather than a bare `Error` — like {@link EngineBusyError} and
 * {@link EngineNoMoveError} — so a boundary adapter can separate it from a
 * missed deadline or a dead channel by `instanceof` instead of by matching
 * message text. The distinction is worth making because the two failures
 * call for opposite responses: a timeout is transient and retrying the same
 * position may well succeed, whereas an unplayable move is deterministic and
 * a retry against the same position reproduces it exactly. The mobile hook
 * still folds it into its `timeout` kind today, which is precisely the
 * conflation this class makes fixable.
 *
 * `cause` carries chess.js's own rejection. Without it the whole report is
 * the UCI string, which is the one thing the reader already had.
 */
export class UciConversionError extends Error {
  constructor(
    readonly uciMove: UciMove,
    readonly fen: Fen,
    options?: { cause?: unknown },
  ) {
    super(`Invalid UCI move: ${uciMove}`, options);
    this.name = "UciConversionError";
  }
}

/**
 * Per-platform knobs the engine cannot derive on its own.
 */
export type ChessEngineOptions = Readonly<{
  /**
   * Deadline for the `go` → `bestmove` roundtrip, derived from that call's
   * search budget. Omit it to keep {@link UciTransport}'s flat 10s default.
   */
  bestMoveTimeoutMs?: (searchTimeMs: number) => number;
}>;

/**
 * Number of attempts `ensureInitialized` makes before surfacing the last
 * initialization error to the caller. Engine spin-up can transiently fail
 * (Worker / WASM boot race, tab throttling, `onerror` from Stockfish) — a
 * small bounded retry makes first-move experience far more robust without
 * hiding genuine configuration errors.
 */
export const MAX_INIT_ATTEMPTS = 3;

/**
 * Delay (in ms) applied **before** each retry attempt. The first retry waits
 * 500 ms, the second 1500 ms, the third 3000 ms. Indexed by attempt number
 * (1-based): `INIT_RETRY_DELAYS_MS[attempt - 1]`.
 */
export const INIT_RETRY_DELAYS_MS = [500, 1500, 3000] as const;

/**
 * Framework-agnostic chess engine orchestration.
 *
 * Drives the UCI handshake (`uciok` → `readyok`), skill-level setup, and the
 * `go` → `bestmove` request/response roundtrip. Platform details (Worker on
 * web, WebView bridge on mobile) live behind a {@link UciMessageChannel}
 * that the caller supplies via `channelFactory` in the constructor. Each
 * init attempt consumes a fresh channel so a dead Worker / bridge is replaced
 * cleanly on retry.
 *
 * Lifecycle is intentionally **caller-owned**: this class is instance-safe
 * (nothing prevents constructing multiple engines) and exposes no global
 * registry. Apps wire a fresh engine through a higher-level `ChessOpponent`
 * adapter (see `@blindfold-chess/features/ai-game/opponent`) and manage
 * disposal explicitly — typically tying it to the consumer component's
 * mount lifecycle.
 */
export class ChessEngine {
  private channelFactory: () => UciMessageChannel;
  private transport: UciTransport | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private skillLevel: SkillLevel = 5;
  private isProcessing = false;
  private bestMoveTimeoutMs: ((searchTimeMs: number) => number) | undefined;

  constructor(
    channelFactory: () => UciMessageChannel,
    options: ChessEngineOptions = {},
  ) {
    this.channelFactory = channelFactory;
    this.bestMoveTimeoutMs = options.bestMoveTimeoutMs;
  }

  /**
   * Run the handshake now instead of on the first request.
   *
   * `getBestMove` / `getEvaluation` already initialize on demand, so this is
   * only for callers that have their own notion of "the engine is up" to
   * report — the mobile hook flips its `engineState` to `ready` on this
   * promise, so the handshake (and its retries) finish before the first move
   * request rather than inside it. Repeat calls are cheap: they join the
   * in-flight attempt, or return immediately once initialized.
   */
  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeWithRetry();
    }
    await this.initializationPromise;
  }

  /**
   * Wrap `initializeEngine` with bounded retry + exponential backoff. Only
   * init failures trigger a retry; downstream errors (`getBestMove`,
   * `getEvaluation`) flow through unchanged. After the final attempt the last
   * error is rethrown verbatim so callers keep their existing error-handling
   * behaviour.
   */
  private async initializeWithRetry(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt++) {
      try {
        await this.initializeEngine();
        return;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_INIT_ATTEMPTS) {
          console.warn("Chess engine init retry", { attempt, error });
          await new Promise((resolve) =>
            setTimeout(resolve, INIT_RETRY_DELAYS_MS[attempt - 1] ?? 0),
          );
        }
      }
    }
    // Terminal failure: allow a future `ensureInitialized()` to start a fresh
    // retry chain. This must only happen HERE — clearing the promise on every
    // failed attempt (as `initializeEngine` once did) opens a window during
    // the backoff sleep where a concurrent caller sees `null` and spawns a
    // second, overlapping retry chain with its own channel.
    this.initializationPromise = null;
    throw lastError;
  }

  private async initializeEngine(): Promise<void> {
    try {
      const channel = this.channelFactory();
      this.transport = new UciTransport(channel);

      // Initialize UCI protocol and wait for uciok / readyok handshake
      await this.transport.waitForUciOk();
      await this.transport.waitForReadyOk();
      await this.setSkillLevel(this.skillLevel);

      this.isInitialized = true;
    } catch (error) {
      // Tear down the dead transport before rethrowing so the next attempt
      // (from `initializeWithRetry` or a future `ensureInitialized` call)
      // spins up a fresh channel instead of reusing / leaking the broken one.
      if (this.transport) {
        try {
          this.transport.destroy();
        } catch (destroyError) {
          // Swallow destroy errors — the transport is already in a failure
          // state; logging here is enough, we still need to rethrow the
          // original cause below.
          console.error(
            "Failed to destroy broken chess engine transport:",
            destroyError,
          );
        }
        this.transport = null;
      }
      console.error("Failed to initialize chess engine:", error);
      throw new Error(
        `Chess engine initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async setSkillLevel(level: SkillLevel): Promise<void> {
    this.skillLevel = level;

    if (!this.transport) {
      return;
    }

    // Skill-level setup uses fire-and-forget `setoption` commands; no response
    // is expected from Stockfish, so we just post them sequentially.
    const commands = buildSkillLevelCommands(level);
    for (const cmd of commands) {
      this.transport.send(cmd);
    }
  }

  async getBestMove(
    fen: Fen,
    moves: AlgebraicNotation[] = [],
    timeLimit: number = 1000,
    startingFen?: string,
  ): Promise<UciMove> {
    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new EngineBusyError();
    }

    if (!this.transport) {
      throw new Error("Engine not initialized");
    }

    try {
      this.isProcessing = true;

      // Set position. When move history is available we drive Stockfish from
      // the STARTING position plus the full move list, so it retains the
      // context it needs for threefold-repetition / 50-move detection.
      //
      // Crucially we must NOT pass the post-move `fen` together with the move
      // list: `position fen <post-move-fen> moves <full game>` double-applies
      // the game on top of the already-final position. In most positions the
      // first replayed move is illegal in the final position and Stockfish
      // silently ignores the move list — but in rare positions where that
      // first move's coordinates happen to form a legal (unrelated) move in
      // the final position, Stockfish applies it, flips the side to move, and
      // then generates a move for the WRONG colour. That move is illegal when
      // converted against the real `fen`, so `convertUciToAlgebraic` rejects it.
      //
      // With no history (e.g. a custom starting position with no moves yet),
      // `fen` alone fully describes the position.
      if (moves.length > 0) {
        const uciMoves = this.convertMovesToUci(moves, startingFen);
        const basePosition = startingFen ?? getStartingFen();
        this.transport.send(buildPositionCommand(basePosition, uciMoves));
      } else {
        this.transport.send(buildPositionCommand(fen));
      }

      // Get best move
      const move = await this.transport.waitForBestMove(
        buildGoCommand({ movetime: timeLimit }),
        this.bestMoveTimeoutMs?.(timeLimit),
      );

      if (!move) {
        throw new EngineNoMoveError();
      }

      return move as UciMove;
    } finally {
      this.isProcessing = false;
    }
  }

  async getEvaluation(fen: Fen, depth: number = 15): Promise<EvaluationResult> {
    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new EngineBusyError();
    }

    if (!this.transport) {
      throw new Error("Engine not initialized");
    }

    const transport = this.transport;
    this.isProcessing = true;

    // Get evaluation with depth. Score interpretation lives in the
    // accumulator; this method only owns the subscription/timeout plumbing.
    // `isProcessing` is released in exactly one place (the outer `finally`)
    // regardless of which of the three exits (result, timeout, transport
    // error) is taken.
    try {
      transport.send(buildPositionCommand(fen));

      const evaluation = createEvaluationAccumulator();
      const unsubscribe = transport.subscribeInfo(evaluation.onInfo);
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        const bestMoveUci = await Promise.race([
          transport.waitForBestMove(buildGoCommand({ depth }), 20000),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              transport.clearBestMoveResolver();
              reject(new Error("Evaluation timeout"));
            }, 20000); // 20s for background tab scenarios
          }),
        ]);

        if (evaluation.score === null) {
          throw new Error("No evaluation score received");
        }
        return toWhitePerspectiveEvaluation(
          fen,
          evaluation.score,
          evaluation.mate,
          bestMoveUci,
        );
      } finally {
        clearTimeout(timeoutId);
        unsubscribe();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private convertMovesToUci(
    moves: AlgebraicNotation[],
    startingFen?: string,
  ): string[] {
    return movesToUci(moves, startingFen);
  }

  /**
   * Read the engine's UCI move as SAN in `fen`, throwing
   * {@link UciConversionError} when it cannot be played there.
   *
   * Throws rather than forwarding `uciToAlgebraic`'s `Result` because this
   * method sits with the rest of `ChessEngine`'s surface, which is uniformly
   * throw-based (`getBestMove`, `getEvaluation`), and both adapters that call
   * it already translate thrown values into their own `Result` kinds inside a
   * single `try`. Handing one method back a `Result` would give those adapters
   * two error protocols to fold together for no gain.
   */
  convertUciToAlgebraic(uciMove: UciMove, fen: Fen): AlgebraicNotation {
    const converted = uciToAlgebraic(uciMove, fen);
    if (converted.ok) {
      return converted.value;
    }
    throw new UciConversionError(uciMove, fen, {
      cause: converted.error.cause,
    });
  }

  get isReady(): boolean {
    return this.isInitialized;
  }

  async destroy(): Promise<void> {
    if (this.transport) {
      this.transport.destroy();
      this.transport = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    this.isProcessing = false;
  }
}
