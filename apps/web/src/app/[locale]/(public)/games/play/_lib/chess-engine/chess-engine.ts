import {
  buildGoCommand,
  buildPositionCommand,
  buildSkillLevelCommands,
  parseUciScore,
} from '@blindfold-chess/features/ai-game';
import { movesToUci, uciToAlgebraic } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Fen, UciMove } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import { UciTransport } from './uci-transport';

export type EvaluationResult = {
  score: number; // Centipawn score from white's perspective
  mate?: number; // Mate in N moves (positive = white wins, negative = black wins)
  bestMove?: string; // Best move in UCI format
};

export class ChessEngine {
  private transport: UciTransport | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private skillLevel: SkillLevel = 5;
  private isProcessing = false;

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeEngine();
    }
    await this.initializationPromise;
  }

  private async initializeEngine(): Promise<void> {
    try {
      const stockfishPath = '/stockfish.js';
      this.transport = new UciTransport(stockfishPath);

      // Initialize UCI protocol and wait for uciok / readyok handshake
      await this.transport.waitForUciOk();
      await this.transport.waitForReadyOk();
      await this.setSkillLevel(this.skillLevel);

      this.isInitialized = true;
    } catch (error) {
      this.initializationPromise = null;
      console.error('Failed to initialize chess engine:', error);
      throw new Error(
        `Chess engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    startingFen?: string
  ): Promise<UciMove> {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Chess engine can only be used in browser environment');
    }

    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new Error('Engine is already processing a request');
    }

    if (!this.transport) {
      throw new Error('Engine not initialized');
    }

    try {
      this.isProcessing = true;

      // Set position
      const uciMoves = moves.length > 0 ? this.convertMovesToUci(moves, startingFen) : undefined;
      this.transport.send(buildPositionCommand(fen, uciMoves));

      // Get best move
      const move = await this.transport.waitForBestMove(buildGoCommand({ movetime: timeLimit }));

      if (!move) {
        throw new Error('Engine failed to return a move');
      }

      return move as UciMove;
    } finally {
      this.isProcessing = false;
    }
  }

  async getEvaluation(fen: Fen, depth: number = 15): Promise<EvaluationResult> {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Chess engine can only be used in browser environment');
    }

    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new Error('Engine is already processing a request');
    }

    if (!this.transport) {
      throw new Error('Engine not initialized');
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

        if (score.kind === 'cp') {
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
        reject(new Error('Evaluation timeout'));
      }, 20000); // Increased to 20 seconds for background tab scenarios

      transport
        .waitForBestMove(buildGoCommand({ depth }), 20000)
        .then((bestMoveUci) => {
          clearTimeout(timeoutId);
          unsubscribe();
          this.isProcessing = false;

          if (latestScore !== null) {
            // Stockfish returns score from the perspective of the side to move
            // We need to convert it to always be from white's perspective
            const isWhiteToMove = fen.split(' ')[1] === 'w';
            const scoreFromWhitePerspective = isWhiteToMove ? latestScore : -latestScore;
            const mateFromWhitePerspective =
              latestMate !== undefined ? (isWhiteToMove ? latestMate : -latestMate) : undefined;

            resolve({
              score: scoreFromWhitePerspective,
              mate: mateFromWhitePerspective,
              bestMove: bestMoveUci,
            });
          } else {
            reject(new Error('No evaluation score received'));
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

  private convertMovesToUci(moves: AlgebraicNotation[], startingFen?: string): string[] {
    return movesToUci(moves as string[], startingFen);
  }

  convertUciToAlgebraic(uciMove: UciMove, fen: Fen): AlgebraicNotation {
    try {
      return uciToAlgebraic(uciMove, fen) as AlgebraicNotation;
    } catch (error) {
      console.error('Failed to convert UCI to algebraic:', uciMove, error);
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

// Singleton instance for the app
let engineInstance: ChessEngine | null = null;

export function getChessEngine(): ChessEngine {
  // Only create instance in browser environment
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Chess engine can only be created in browser environment');
  }

  if (!engineInstance) {
    engineInstance = new ChessEngine();
  }
  return engineInstance;
}
