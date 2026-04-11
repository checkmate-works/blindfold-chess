import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import type { PositionAccuracy, PositionData } from '../types';
import { positionMemoryMachine } from './positionMemoryMachine';
import type { PositionMemoryInput } from './types';

const createMockPositions = (count: number): PositionData[] =>
  Array.from({ length: count }, (_, i) => ({
    fen: `8/8/8/8/8/8/8/${i + 1}K6 w - - 0 1`,
    isBlackToMove: false,
  }));

const createMockAccuracy = (accuracy: number): PositionAccuracy => ({
  correctPieces: 10,
  totalPieces: 12,
  incorrectPieces: 1,
  missingPieces: 1,
  extraPieces: 0,
  netScore: 10,
  accuracy,
  details: [],
});

/**
 * Builder for mock accuracy payloads with explicit mistake shape. The
 * `totalMistakes` counter aggregates `incorrectPieces + missingPieces +
 * extraPieces`, so tests can dial in the exact per-submission increment.
 */
const createMockAccuracyWithErrors = ({
  correctPieces,
  incorrectPieces,
  missingPieces,
  extraPieces,
}: {
  correctPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
}): PositionAccuracy => {
  const totalPieces = correctPieces + incorrectPieces + missingPieces;
  return {
    correctPieces,
    totalPieces,
    incorrectPieces,
    missingPieces,
    extraPieces,
    netScore: correctPieces - (incorrectPieces + extraPieces) * 0.5,
    accuracy: totalPieces === 0 ? 0 : (correctPieces / totalPieces) * 100,
    details: [],
  };
};

const createTestInput = (overrides?: Partial<PositionMemoryInput>): PositionMemoryInput => ({
  positions: createMockPositions(3),
  timeLimit: 10,
  mode: 'custom',
  ...overrides,
});

describe('positionMemoryMachine', () => {
  describe('initial state', () => {
    it('should start in memorize state', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      expect(actor.getSnapshot().value).toBe('memorize');
    });

    it('should initialize context from input', () => {
      const input = createTestInput({ timeLimit: 30, mode: 'tutorial' });
      const actor = createActor(positionMemoryMachine, { input });
      actor.start();

      const context = actor.getSnapshot().context;
      expect(context.mode).toBe('tutorial');
      expect(context.timeLimit).toBe(30);
      expect(context.memorizeTimeLeft).toBe(30);
      expect(context.currentProblemIndex).toBe(0);
      expect(context.positions).toHaveLength(3);
    });
  });

  describe('memorize state', () => {
    it('should transition to recreate on MEMORIZED event', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      actor.send({ type: 'MEMORIZED' });

      expect(actor.getSnapshot().value).toBe('recreate');
    });

    it('should decrement timer on TICK event', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ timeLimit: 10 }),
      });
      actor.start();

      actor.send({ type: 'TICK' });

      expect(actor.getSnapshot().context.memorizeTimeLeft).toBe(9);
    });

    it('should transition to recreate when timer expires', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ timeLimit: 1 }),
      });
      actor.start();

      // Tick until timer reaches 0
      actor.send({ type: 'TICK' });

      expect(actor.getSnapshot().context.memorizeTimeLeft).toBe(0);

      // Next tick should transition to recreate
      actor.send({ type: 'TICK' });

      expect(actor.getSnapshot().value).toBe('recreate');
    });

    it('should skip to next problem when SKIP and more problems exist', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      actor.send({ type: 'SKIP' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('memorize');
      expect(snapshot.context.currentProblemIndex).toBe(1);
      expect(snapshot.context.skippedProblems.has(0)).toBe(true);
    });

    it('should go to sessionResult when SKIP on last problem', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();

      actor.send({ type: 'SKIP' });

      expect(actor.getSnapshot().value).toBe('sessionResult');
    });

    it('should open and close quit modal', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      actor.send({ type: 'OPEN_QUIT_MODAL' });
      expect(actor.getSnapshot().context.showQuitModal).toBe(true);

      actor.send({ type: 'CANCEL_QUIT' });
      expect(actor.getSnapshot().context.showQuitModal).toBe(false);
    });

    it('should go to sessionResult on CONFIRM_QUIT', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      actor.send({ type: 'OPEN_QUIT_MODAL' });
      actor.send({ type: 'CONFIRM_QUIT' });

      expect(actor.getSnapshot().value).toBe('sessionResult');
    });
  });

  describe('recreate state', () => {
    it('should update recreated position on UPDATE_POSITION event', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      const newFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      actor.send({ type: 'UPDATE_POSITION', fen: newFen });

      expect(actor.getSnapshot().context.recreatedPosition).toBe(newFen);
    });

    it('should transition to problemResult on SUBMIT', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      const accuracy = createMockAccuracy(85);
      actor.send({ type: 'SUBMIT', accuracy });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('problemResult');
      expect(snapshot.context.currentAccuracy).toEqual(accuracy);
      expect(snapshot.context.problemResults.get(0)).toEqual(accuracy);
    });

    it('should go back to memorize on VIEW_AGAIN', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ timeLimit: 10 }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      actor.send({ type: 'VIEW_AGAIN' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('memorize');
      expect(snapshot.context.memorizeTimeLeft).toBe(10);
    });

    it('should skip to next problem when SKIP and more problems exist', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      actor.send({ type: 'SKIP' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('memorize');
      expect(snapshot.context.currentProblemIndex).toBe(1);
    });
  });

  describe('problemResult state', () => {
    it('should go to next problem on NEXT_PROBLEM', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(90) });

      actor.send({ type: 'NEXT_PROBLEM' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('memorize');
      expect(snapshot.context.currentProblemIndex).toBe(1);
      expect(snapshot.context.memorizeTimeLeft).toBe(10);
    });

    it('should not transition on NEXT_PROBLEM when on last problem', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(90) });

      actor.send({ type: 'NEXT_PROBLEM' });

      // Should stay in problemResult since there's no next problem
      expect(actor.getSnapshot().value).toBe('problemResult');
    });

    it('should go to sessionResult on VIEW_RESULTS', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(90) });

      actor.send({ type: 'VIEW_RESULTS' });

      expect(actor.getSnapshot().value).toBe('sessionResult');
    });
  });

  describe('sessionResult state', () => {
    it('should be a final state', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(90) });
      actor.send({ type: 'VIEW_RESULTS' });

      expect(actor.getSnapshot().value).toBe('sessionResult');
      expect(actor.getSnapshot().status).toBe('done');
    });
  });

  describe('totalMistakes accumulation', () => {
    it('initializes totalMistakes to 0', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput(),
      });
      actor.start();

      expect(actor.getSnapshot().context.totalMistakes).toBe(0);
    });

    it('adds (incorrectPieces + missingPieces + extraPieces) on SUBMIT', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 10,
          incorrectPieces: 2,
          missingPieces: 1,
          extraPieces: 0,
        }),
      });

      expect(actor.getSnapshot().context.totalMistakes).toBe(3);
    });

    it('stays at 0 on a perfect submission', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 12,
          incorrectPieces: 0,
          missingPieces: 0,
          extraPieces: 0,
        }),
      });

      expect(actor.getSnapshot().context.totalMistakes).toBe(0);
    });

    it('counts extra pieces against the mistakes total', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(1) }),
      });
      actor.start();
      actor.send({ type: 'MEMORIZED' });

      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 12,
          incorrectPieces: 0,
          missingPieces: 0,
          extraPieces: 2,
        }),
      });

      expect(actor.getSnapshot().context.totalMistakes).toBe(2);
    });

    it('accumulates across multiple problems', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(3), timeLimit: 5 }),
      });
      actor.start();

      // Problem 1: 1 + 1 + 0 = 2 mistakes
      actor.send({ type: 'MEMORIZED' });
      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 10,
          incorrectPieces: 1,
          missingPieces: 1,
          extraPieces: 0,
        }),
      });
      expect(actor.getSnapshot().context.totalMistakes).toBe(2);
      actor.send({ type: 'NEXT_PROBLEM' });

      // Problem 2: 0 + 0 + 1 = 1 mistake → total 3
      actor.send({ type: 'MEMORIZED' });
      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 12,
          incorrectPieces: 0,
          missingPieces: 0,
          extraPieces: 1,
        }),
      });
      expect(actor.getSnapshot().context.totalMistakes).toBe(3);
      actor.send({ type: 'NEXT_PROBLEM' });

      // Problem 3: 2 + 1 + 0 = 3 mistakes → total 6
      actor.send({ type: 'MEMORIZED' });
      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 9,
          incorrectPieces: 2,
          missingPieces: 1,
          extraPieces: 0,
        }),
      });
      expect(actor.getSnapshot().context.totalMistakes).toBe(6);
    });

    it('does not mutate totalMistakes on SKIP (skipped problems contribute 0)', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(2) }),
      });
      actor.start();
      // Submit a problem with errors first.
      actor.send({ type: 'MEMORIZED' });
      actor.send({
        type: 'SUBMIT',
        accuracy: createMockAccuracyWithErrors({
          correctPieces: 10,
          incorrectPieces: 1,
          missingPieces: 0,
          extraPieces: 0,
        }),
      });
      expect(actor.getSnapshot().context.totalMistakes).toBe(1);

      // Skip the second problem — totalMistakes must not change.
      actor.send({ type: 'NEXT_PROBLEM' });
      actor.send({ type: 'SKIP' });

      expect(actor.getSnapshot().context.totalMistakes).toBe(1);
    });
  });

  describe('full session flow', () => {
    it('should complete a full session with multiple problems', () => {
      const actor = createActor(positionMemoryMachine, {
        input: createTestInput({ positions: createMockPositions(2), timeLimit: 5 }),
      });
      actor.start();

      // Problem 1
      expect(actor.getSnapshot().context.currentProblemIndex).toBe(0);
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'UPDATE_POSITION', fen: 'test-fen-1' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(80) });
      actor.send({ type: 'NEXT_PROBLEM' });

      // Problem 2
      expect(actor.getSnapshot().context.currentProblemIndex).toBe(1);
      expect(actor.getSnapshot().context.memorizeTimeLeft).toBe(5);
      actor.send({ type: 'MEMORIZED' });
      actor.send({ type: 'UPDATE_POSITION', fen: 'test-fen-2' });
      actor.send({ type: 'SUBMIT', accuracy: createMockAccuracy(90) });

      // View results
      actor.send({ type: 'VIEW_RESULTS' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('sessionResult');
      expect(snapshot.context.problemResults.size).toBe(2);
      expect(snapshot.context.recreatedPositions.size).toBe(2);
    });
  });
});
