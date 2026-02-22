import type { AlgebraicNotation, Fen, UciMove } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

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

    if (message.includes('uciok')) {
      const callback = this.pendingCallbacks.get('uciok');
      if (callback) {
        this.pendingCallbacks.delete('uciok');
        callback({ type: 'uci', data: message });
      }
    } else if (message.includes('readyok')) {
      const callback = this.pendingCallbacks.get('readyok');
      if (callback) {
        this.pendingCallbacks.delete('readyok'); // Delete first to prevent duplicate calls
        callback({ type: 'readyok', data: message });
      }
    } else if (message.includes('bestmove')) {
      const matches = message.match(/bestmove (\w+)/);
      if (matches) {
        const move = matches[1];
        const callback = this.pendingCallbacks.get('bestmove');
        if (callback) {
          this.pendingCallbacks.delete('bestmove'); // Delete first to prevent duplicate calls
          callback({ type: 'bestmove', data: message, move });
        }
      }
    } else if (message.includes('info') && message.includes('score')) {
      // Handle evaluation info messages
      const callback = this.pendingCallbacks.get('evaluation');
      if (callback) {
        callback({ type: 'info', data: message });
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

    // Set Stockfish skill level (1-20)
    // Stockfish 17 NNUE supports the same UCI Skill Level parameter as earlier versions
    await this.sendCommand(`setoption name Skill Level value ${level}`);

    // For levels below 15, also use UCI_LimitStrength to cap playing strength
    // This provides more consistent behavior across different skill levels
    if (level < 15) {
      await this.sendCommand(`setoption name UCI_LimitStrength value true`);
      // Map skill level to approximate Elo rating
      // Level 1 (~800 Elo) to Level 14 (~2100 Elo)
      const targetElo = Math.max(800, 700 + level * 100);
      await this.sendCommand(`setoption name UCI_Elo value ${targetElo}`);
    } else {
      // For higher levels (15-20), disable UCI_LimitStrength to allow full strength
      await this.sendCommand(`setoption name UCI_LimitStrength value false`);
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
      if (moves.length > 0) {
        const moveString = this.convertMovesToUci(moves, startingFen).join(' ');
        await this.sendCommand(`position fen ${fen} moves ${moveString}`);
      } else {
        await this.sendCommand(`position fen ${fen}`);
      }

      // Get best move
      const response = await this.sendCommand(`go movetime ${timeLimit}`);

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

    try {
      this.isProcessing = true;

      // Set position
      await this.sendCommand(`position fen ${fen}`);

      // Get evaluation with depth
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingCallbacks.delete('evaluation');
          this.pendingCallbacks.delete('bestmove');
          reject(new Error('Evaluation timeout'));
        }, 20000); // Increased to 20 seconds for background tab scenarios

        let latestScore: number | null = null;
        let latestMate: number | undefined;
        let bestMoveUci: string | undefined;

        this.pendingCallbacks.set('evaluation', (response) => {
          const message = response.data;

          // Parse score from info messages
          // Format: "info depth 15 score cp 123" or "info depth 15 score mate 5"
          const cpMatch = message.match(/score cp (-?\d+)/);
          const mateMatch = message.match(/score mate (-?\d+)/);

          if (cpMatch) {
            latestScore = parseInt(cpMatch[1], 10);
            latestMate = undefined;
          } else if (mateMatch) {
            latestMate = parseInt(mateMatch[1], 10);
            // Use a large score to indicate mate
            latestScore = latestMate > 0 ? 10000 : -10000;
          }
        });

        // Start evaluation
        this.engine?.postMessage(`go depth ${depth}`);

        // Wait for bestmove to know evaluation is complete
        this.pendingCallbacks.set('bestmove', (response) => {
          clearTimeout(timeoutId);
          this.pendingCallbacks.delete('evaluation');
          this.pendingCallbacks.delete('bestmove');

          // Extract best move from response
          if (response.move) {
            bestMoveUci = response.move;
          }

          if (latestScore !== null) {
            // Stockfish returns score from the perspective of the side to move
            // We need to convert it to always be from white's perspective
            // FEN format: "... w ..." means white to move, "... b ..." means black to move
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
    } finally {
      this.isProcessing = false;
    }
  }

  private convertMovesToUci(moves: AlgebraicNotation[], startingFen?: string): string[] {
    // Convert algebraic notation to UCI format using chess.js
    // Initialize with custom FEN or standard starting position
    const chess = startingFen ? new Chess(startingFen) : new Chess();
    const uciMoves: string[] = [];

    for (const move of moves) {
      try {
        const result = chess.move(move);
        if (result) {
          uciMoves.push(result.from + result.to + (result.promotion || ''));
        } else {
          console.warn(`Invalid move in UCI conversion: ${move}`);
          break;
        }
      } catch (error) {
        console.warn(`Error converting move to UCI: ${move}`, error);
        break;
      }
    }

    return uciMoves;
  }

  convertUciToAlgebraic(uciMove: UciMove, fen: Fen): AlgebraicNotation {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.slice(4);

    try {
      const result = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      return result.san as AlgebraicNotation;
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
