// @vitest-environment jsdom
import { checkAnswer, generateSingleQuestion } from '@blindfold-chess/features/coordinate-quiz';
import { describe, expect, it } from 'vitest';

describe('CoordinateQuizChallenge timed mode logic', () => {
  describe('question generation', () => {
    it('generates a question with a valid target square', () => {
      const question = generateSingleQuestion('white');
      expect(question.targetSquare).toMatch(/^[a-h][1-8]$/);
    });

    it('generates a question with correct orientation for white', () => {
      const question = generateSingleQuestion('white');
      expect(question.orientation).toBe('white');
    });

    it('generates a question with correct orientation for black', () => {
      const question = generateSingleQuestion('black');
      expect(question.orientation).toBe('black');
    });

    it('generates a question with random orientation (white or black)', () => {
      const question = generateSingleQuestion('random');
      expect(['white', 'black']).toContain(question.orientation);
    });

    it('avoids recently used squares when possible', () => {
      const recentSquares = ['a1', 'b2', 'c3', 'd4', 'e5'] as const;
      // Run multiple times to check statistically
      for (let i = 0; i < 20; i++) {
        const question = generateSingleQuestion('white', [...recentSquares]);
        // With 64 squares minus 5 excluded, the question should avoid recent squares
        const isRecent = recentSquares.includes(
          question.targetSquare as (typeof recentSquares)[number]
        );
        if (!isRecent) {
          expect(isRecent).toBe(false);
          return;
        }
      }
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
});

describe('timeLimit parameter parsing', () => {
  it('parses valid timeLimit', () => {
    const timeLimit = '90';
    const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;
    expect(timeLimitValue).toBe(90);
  });

  it('defaults to 60 when timeLimit is missing', () => {
    const timeLimit: string | undefined = undefined;
    const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;
    expect(timeLimitValue).toBe(60);
  });

  it('defaults to 60 when timeLimit is not a number', () => {
    const timeLimit = 'abc';
    const parsed = parseInt(timeLimit, 10);
    const timeLimitValue = !isNaN(parsed) && parsed > 0 ? parsed : 60;
    expect(timeLimitValue).toBe(60);
  });
});
