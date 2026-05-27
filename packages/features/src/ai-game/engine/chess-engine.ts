import { movesToUci, uciToAlgebraic } from "../../chess-core";
import type { AlgebraicNotation, Fen, UciMove } from "@blindfold-chess/types";

import {
  buildGoCommand,
  buildPositionCommand,
  parseUciScore,
} from "../uci-protocol";
import { buildSkillLevelCommands } from "../skill-level";
import type { SkillLevel } from "../types";

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
  const isWhiteToMove = fen.split(" ")[1] === "w";
  return {
    score: isWhiteToMove ? score : -score,
    mate: mate === undefined ? undefined : isWhiteToMove ? mate : -mate,
    bestMove,
  };
}

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

  constructor(channelFactory: () => UciMessageChannel) {
    this.channelFactory = channelFactory;
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
      this.initializationPromise = null;
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
      throw new Error("Engine is already processing a request");
    }

    if (!this.transport) {
      throw new Error("Engine not initialized");
    }

    try {
      this.isProcessing = true;

      // Set position
      const uciMoves =
        moves.length > 0
          ? this.convertMovesToUci(moves, startingFen)
          : undefined;
      this.transport.send(buildPositionCommand(fen, uciMoves));

      // Get best move
      const move = await this.transport.waitForBestMove(
        buildGoCommand({ movetime: timeLimit }),
      );

      if (!move) {
        throw new Error("Engine failed to return a move");
      }

      return move as UciMove;
    } finally {
      this.isProcessing = false;
    }
  }

  async getEvaluation(fen: Fen, depth: number = 15): Promise<EvaluationResult> {
    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new Error("Engine is already processing a request");
    }

    if (!this.transport) {
      throw new Error("Engine not initialized");
    }

    this.isProcessing = true;

    // Set position
    try {
      this.transport.send(buildPositionCommand(fen));
    } catch (error) {
      this.isProcessing = false;
      throw error;
    }

    const transport = this.transport;

    // Get evaluation with depth
    return new Promise((resolve, reject) => {
      let latestScore: number | null = null;
      let latestMate: number | undefined;

      const unsubscribe = transport.subscribeInfo((message) => {
        const score = parseUciScore(message);
        if (!score) return;

        if (score.kind === "cp") {
          latestScore = score.value;
          latestMate = undefined;
        } else {
          latestMate = score.value;
          latestScore = score.value > 0 ? 10000 : -10000;
        }
      });

      const timeoutId = setTimeout(() => {
        unsubscribe();
        transport.clearBestMoveResolver();
        this.isProcessing = false;
        reject(new Error("Evaluation timeout"));
      }, 20000); // 20s for background tab scenarios

      transport
        .waitForBestMove(buildGoCommand({ depth }), 20000)
        .then((bestMoveUci) => {
          clearTimeout(timeoutId);
          unsubscribe();
          this.isProcessing = false;

          if (latestScore !== null) {
            resolve(
              toWhitePerspectiveEvaluation(
                fen,
                latestScore,
                latestMate,
                bestMoveUci,
              ),
            );
          } else {
            reject(new Error("No evaluation score received"));
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          unsubscribe();
          this.isProcessing = false;
          reject(error);
        });
    });
  }

  private convertMovesToUci(
    moves: AlgebraicNotation[],
    startingFen?: string,
  ): string[] {
    return movesToUci(moves as string[], startingFen);
  }

  convertUciToAlgebraic(uciMove: UciMove, fen: Fen): AlgebraicNotation {
    try {
      return uciToAlgebraic(uciMove, fen) as AlgebraicNotation;
    } catch (error) {
      console.error("Failed to convert UCI to algebraic:", uciMove, error);
      throw new Error(`Invalid UCI move: ${uciMove}`);
    }
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
