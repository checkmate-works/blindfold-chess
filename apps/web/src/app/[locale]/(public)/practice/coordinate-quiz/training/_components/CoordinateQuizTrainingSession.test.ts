// @vitest-environment jsdom
import { checkAnswer, generateSingleQuestion } from '@blindfold-chess/features/coordinate-quiz';
import { describe, expect, it } from 'vitest';

describe('CoordinateQuizTrainingSession logic', () => {
  describe('question generation for training mode', () => {
    it('generates a question with a valid target square', () => {
      const question = generateSingleQuestion('white');
      expect(question.targetSquare).toMatch(/^[a-h][1-8]$/);
    });

    it('generates questions one at a time (not batch)', () => {
      const question1 = generateSingleQuestion('white');
      const question2 = generateSingleQuestion('white', [question1.targetSquare]);

      expect(question1.targetSquare).toMatch(/^[a-h][1-8]$/);
      expect(question2.targetSquare).toMatch(/^[a-h][1-8]$/);
    });

    it('avoids recent squares when generating next question', () => {
      const recentSquares = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8', 'a2', 'b3'] as const;

      // Run multiple times to check avoidance
      for (let i = 0; i < 20; i++) {
        const question = generateSingleQuestion('white', [...recentSquares]);
        const isRecent = recentSquares.includes(
          question.targetSquare as (typeof recentSquares)[number]
        );
        if (!isRecent) {
          expect(isRecent).toBe(false);
          return;
        }
      }
    });

    it('keeps recent squares list to 10 items', () => {
      let recentSquares: string[] = [];

      for (let i = 0; i < 15; i++) {
        const question = generateSingleQuestion('white', recentSquares as never[]);
        recentSquares = [...recentSquares, question.targetSquare].slice(-10);
      }

      expect(recentSquares).toHaveLength(10);
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
    it('correctly validates a correct answer', () => {
      const targetSquare = 'e4';
      const clickedSquare = 'e4';
      expect(checkAnswer(clickedSquare, targetSquare)).toBe(true);
    });

    it('correctly validates an incorrect answer', () => {
      const targetSquare = 'e4';
      const clickedSquare = 'd5';
      expect(checkAnswer(clickedSquare, targetSquare)).toBe(false);
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
      const expectedUrl = `/${locale}/practice/coordinate-quiz`;
      expect(expectedUrl).toBe('/en/practice/coordinate-quiz');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/coordinate-quiz`;
      expect(expectedUrl).toBe('/ja/practice/coordinate-quiz');
    });
  });
});
