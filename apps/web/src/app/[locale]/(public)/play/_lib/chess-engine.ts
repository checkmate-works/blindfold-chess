import {
  buildGoCommand,
  buildPositionCommand,
  buildSkillLevelCommands,
  parseUciResponse,
  parseUciScore,
} from '@blindfold-chess/features/ai-game';
import { movesToUci, uciToAlgebraic } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Fen, UciMove } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

type EngineResponse = {
  type: 'readyok' | 'bestmove' | 'info' | 'uci';
  data: string;
  move?: string;
  score?: number;
};

export type EvaluationResult = {
  score: number; // Centipawn score from white's perspective
  mate?: number; // Mate in N moves (positive = white wins, negative = black wins)
  bestMove?: string; // Best move in UCI format
};

export class ChessEngine {
  private engine: Worker | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private pendingCallbacks: Map<string, (response: EngineResponse) => void> = new Map();
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
      // Create Web Worker for Stockfish
      // NOTE: This generates a Turbopack warning "TP1001: new Worker(...) is not statically analyse-able"
      // This is expected behavior as we're loading an external Stockfish WebAssembly file from public/
      // The warning doesn't affect functionality and can be safely ignored
      const stockfishPath = '/stockfish.js';
      this.engine = new Worker(stockfishPath);

      this.engine.onmessage = (event) => {
        this.handleEngineMessage(event.data);
      };

      this.engine.onerror = (error) => {
        console.error('Worker error:', error);
        const errorMessage =
          error instanceof ErrorEvent
            ? error.message || error.error?.message || 'Unknown error'
            : String(error);
        throw new Error(`Worker error: ${errorMessage}`);
      };

      // Initialize UCI protocol and wait for uciok response
      await this.sendCommand('uci');
      await this.sendCommand('isready');
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

  private handleEngineMessage(message: string): void {
    // Handle error messages from worker
    if (message.startsWith('Error:') || message.startsWith('Worker Error:')) {
      console.error('Engine worker error:', message);
      return;
    }

    const parsed = parseUciResponse(message);
    if (!parsed) return;

    switch (parsed.type) {
      case 'uciok': {
        const callback = this.pendingCallbacks.get('uciok');
        if (callback) {
          this.pendingCallbacks.delete('uciok');
          callback({ type: 'uci', data: message });
        }
        break;
      }
      case 'readyok': {
        const callback = this.pendingCallbacks.get('readyok');
        if (callback) {
          this.pendingCallbacks.delete('readyok');
          callback({ type: 'readyok', data: message });
        }
        break;
      }
      case 'bestmove': {
        const callback = this.pendingCallbacks.get('bestmove');
        if (callback) {
          this.pendingCallbacks.delete('bestmove');
          callback({ type: 'bestmove', data: message, move: parsed.move });
        }
        break;
      }
      case 'info': {
        const callback = this.pendingCallbacks.get('evaluation');
        if (callback) {
          callback({ type: 'info', data: message });
        }
        break;
      }
    }
  }

  private async sendCommand(command: string): Promise<EngineResponse> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Engine command timeout: ${command}`));
      }, 10000);

      if (command === 'uci') {
        this.pendingCallbacks.set('uciok', (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } else if (command === 'isready') {
        this.pendingCallbacks.set('readyok', (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } else if (command.includes('go')) {
        this.pendingCallbacks.set('bestmove', (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } else {
        // For other commands, resolve immediately
        clearTimeout(timeoutId);
        resolve({ type: 'uci', data: command });
      }

      this.engine?.postMessage(command);
    });
  }

  async setSkillLevel(level: SkillLevel): Promise<void> {
    this.skillLevel = level;

    if (!this.engine) {
      return;
    }

    const commands = buildSkillLevelCommands(level);
    for (const cmd of commands) {
      await this.sendCommand(cmd);
    }
  }

  async getBestMove(
    fen: Fen,
    moves: AlgebraicNotation[] = [],
    timeLimit: number = 1000,
    startingFen?: string
  ): Promise<UciMove> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Chess engine can only be used in browser environment');
    }

    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new Error('Engine is already processing a request');
    }

    try {
      this.isProcessing = true;

      // Set position
      const uciMoves = moves.length > 0 ? this.convertMovesToUci(moves, startingFen) : undefined;
      await this.sendCommand(buildPositionCommand(fen, uciMoves));

      // Get best move
      const response = await this.sendCommand(buildGoCommand({ movetime: timeLimit }));

      if (!response.move) {
        throw new Error('Engine failed to return a move');
      }

      return response.move as UciMove;
    } finally {
      this.isProcessing = false;
    }
  }

  async getEvaluation(fen: Fen, depth: number = 15): Promise<EvaluationResult> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Chess engine can only be used in browser environment');
    }

    await this.ensureInitialized();

    if (this.isProcessing) {
      throw new Error('Engine is already processing a request');
    }

    this.isProcessing = true;

    // Set position
    try {
      await this.sendCommand(buildPositionCommand(fen));
    } catch (error) {
      this.isProcessing = false;
      throw error;
    }

    // Get evaluation with depth
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCallbacks.delete('evaluation');
        this.pendingCallbacks.delete('bestmove');
        this.isProcessing = false;
        reject(new Error('Evaluation timeout'));
      }, 20000); // Increased to 20 seconds for background tab scenarios

      let latestScore: number | null = null;
      let latestMate: number | undefined;
      let bestMoveUci: string | undefined;

      this.pendingCallbacks.set('evaluation', (response) => {
        const score = parseUciScore(response.data);
        if (!score) return;

        if (score.kind === 'cp') {
          latestScore = score.value;
          latestMate = undefined;
        } else {
          latestMate = score.value;
          latestScore = score.value > 0 ? 10000 : -10000;
        }
      });

      // Start evaluation
      this.engine?.postMessage(buildGoCommand({ depth }));

      // Wait for bestmove to know evaluation is complete
      this.pendingCallbacks.set('bestmove', (response) => {
        clearTimeout(timeoutId);
        this.pendingCallbacks.delete('evaluation');
        this.pendingCallbacks.delete('bestmove');
        this.isProcessing = false;

        // Extract best move from response
        if (response.move) {
          bestMoveUci = response.move;
        }

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
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    this.isProcessing = false;
    this.pendingCallbacks.clear();
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

export function destroyChessEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}
