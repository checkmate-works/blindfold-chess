import { Chess } from 'chess.js';

import type { AlgebraicNotation, Fen, SkillLevel, UciMove } from '@/lib/types';

type EngineResponse = {
  type: 'readyok' | 'bestmove' | 'info' | 'uci';
  data: string;
  move?: string;
};

export class ChessEngine {
  private engine: Worker | null = null;
  private isInitialized = false;
  private pendingCallbacks: Map<string, (response: EngineResponse) => void> = new Map();
  private skillLevel: SkillLevel = 5;
  private isProcessing = false;

  constructor() {
    this.initializeEngine().catch(console.error);
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

      // Wait a bit for the worker to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Initialize UCI protocol
      await this.sendCommand('uci');
      await this.sendCommand('isready');
      await this.setSkillLevel(this.skillLevel);

      this.isInitialized = true;
    } catch (error) {
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

    if (message.includes('readyok')) {
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

      if (command === 'isready') {
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

    if (!this.isInitialized || !this.engine) {
      return;
    }

    // Set Stockfish skill level (0-20)
    await this.sendCommand(`setoption name Skill Level value ${level}`);

    // For lower levels, add some randomness
    if (level < 10) {
      await this.sendCommand(`setoption name UCI_LimitStrength value true`);
      await this.sendCommand(`setoption name UCI_Elo value ${Math.max(800, 800 + level * 100)}`);
    }
  }

  async getBestMove(
    fen: Fen,
    moves: AlgebraicNotation[] = [],
    timeLimit: number = 1000
  ): Promise<UciMove> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Chess engine can only be used in browser environment');
    }

    if (!this.isInitialized || !this.engine) {
      throw new Error('Engine not ready');
    }

    if (this.isProcessing) {
      throw new Error('Engine is already processing a request');
    }

    try {
      this.isProcessing = true;

      // Set position
      if (moves.length > 0) {
        const moveString = this.convertMovesToUci(moves).join(' ');
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

  private convertMovesToUci(moves: AlgebraicNotation[]): string[] {
    // Convert algebraic notation to UCI format using chess.js
    const chess = new Chess();
    const uciMoves: string[] = [];

    for (const move of moves) {
      try {
        const result = chess.move(move);
        if (result) {
          uciMoves.push(result.from + result.to + (result.promotion || ''));
        }
      } catch (error) {
        console.warn('Invalid move:', move, error);
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
