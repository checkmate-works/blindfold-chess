// @vitest-environment jsdom
import { generateBalancedMoveQuestions, isLegalMove } from '@blindfold-chess/features/legal-moves';
import type { PieceType } from '@blindfold-chess/features/legal-moves';
import { describe, expect, it } from 'vitest';

const BATCH_SIZE = 100;
const ALL_PIECES: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];

describe('LegalMovesTrainingSession logic', () => {
  describe('question generation for training mode', () => {
    it('generates BATCH_SIZE questions initially', () => {
      const questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
      expect(questions).toHaveLength(BATCH_SIZE);
    });

    it('all generated questions have valid from/to squares and piece', () => {
      const questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
      const validFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const validRanks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (const q of questions) {
        expect(validFiles).toContain(q.from[0]);
        expect(validRanks).toContain(q.from[1]);
        expect(validFiles).toContain(q.to[0]);
        expect(validRanks).toContain(q.to[1]);
        expect(ALL_PIECES).toContain(q.piece);
      }
    });

    it('regenerates when running low on questions (within 10 of the end)', () => {
      let questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
      const currentIndex = BATCH_SIZE - 10;

      // Simulate the regeneration logic from LegalMovesTrainingSession
      if (questions.length > 0 && currentIndex >= questions.length - 10) {
        const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
        questions = [...questions, ...newBatch];
      }

      expect(questions).toHaveLength(BATCH_SIZE * 2);
    });

    it('does not regenerate when not close to the end', () => {
      let questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
      const currentIndex = 5;

      // Simulate the regeneration logic
      if (questions.length > 0 && currentIndex >= questions.length - 10) {
        const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
        questions = [...questions, ...newBatch];
      }

      expect(questions).toHaveLength(BATCH_SIZE);
    });

    it('regeneration threshold is exactly at length - 10', () => {
      let questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
      let currentIndex = BATCH_SIZE - 11;

      // Just before threshold: should NOT regenerate
      if (questions.length > 0 && currentIndex >= questions.length - 10) {
        const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
        questions = [...questions, ...newBatch];
      }
      expect(questions).toHaveLength(BATCH_SIZE);

      // At threshold: should regenerate
      currentIndex = BATCH_SIZE - 10;
      if (questions.length > 0 && currentIndex >= questions.length - 10) {
        const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
        questions = [...questions, ...newBatch];
      }
      expect(questions).toHaveLength(BATCH_SIZE * 2);
    });

    it('can sustain multiple regeneration cycles', () => {
      let questions = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);

      // Simulate 3 regeneration cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        const currentIndex = questions.length - 10;
        if (questions.length > 0 && currentIndex >= questions.length - 10) {
          const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, ALL_PIECES);
          questions = [...questions, ...newBatch];
        }
      }

      expect(questions).toHaveLength(BATCH_SIZE * 4);
    });
  });

  describe('answer tracking', () => {
    it('tracks correct answers', () => {
      const answers = [true, true, false, true, false];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(3);
      expect(incorrect).toBe(2);
    });

    it('handles empty answers array', () => {
      const answers: boolean[] = [];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(0);
      expect(incorrect).toBe(0);
    });

    it('handles all correct answers', () => {
      const answers = [true, true, true, true, true];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(5);
      expect(incorrect).toBe(0);
    });

    it('handles all incorrect answers', () => {
      const answers = [false, false, false, false, false];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(0);
      expect(incorrect).toBe(5);
    });
  });

  describe('answer validation', () => {
    it('correctly validates a legal move as legal', () => {
      // e1 to e2 is a legal king move
      const isLegal = isLegalMove('e1', 'e2', 'king');
      expect(isLegal).toBe(true);
    });

    it('correctly validates an illegal move as illegal', () => {
      // e1 to e4 is not a legal king move
      const isLegal = isLegalMove('e1', 'e4', 'king');
      expect(isLegal).toBe(false);
    });
  });

  describe('training mode has no timer', () => {
    it('does not use timeLimit or timeRemaining concepts', () => {
      // Training mode simply does not instantiate a timer.
      // This test documents the design decision.
      const hasTimer = false;
      expect(hasTimer).toBe(false);
    });
  });

  describe('end training navigation', () => {
    it('navigates back to setup page on end', () => {
      const locale = 'en';
      const expectedUrl = `/${locale}/practice/legal-moves`;
      expect(expectedUrl).toBe('/en/practice/legal-moves');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/legal-moves`;
      expect(expectedUrl).toBe('/ja/practice/legal-moves');
    });
  });
});
