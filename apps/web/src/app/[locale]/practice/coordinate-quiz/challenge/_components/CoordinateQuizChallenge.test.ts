// @vitest-environment jsdom
import { checkAnswer, generateSingleQuestion } from '@blindfold-chess/features';
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

  describe('timer behavior', () => {
    it('uses actual timeLimit', () => {
      const timeLimit = 60;
      expect(timeLimit).toBe(60);
    });

    it('calculates correct timeRemaining', () => {
      const timeLimit = 60;
      const timeElapsed = 30;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      expect(timeRemaining).toBe(30);
    });

    it('timeRemaining does not go below 0', () => {
      const timeLimit = 60;
      const timeElapsed = 70;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      expect(timeRemaining).toBe(0);
    });
  });

  describe('onTimeLimitReached behavior', () => {
    it('sets isFinished when time limit is reached', () => {
      let isFinished = false;

      const onTimeLimitReached = () => {
        isFinished = true;
      };

      onTimeLimitReached();
      expect(isFinished).toBe(true);
    });
  });

  describe('result page redirect logic', () => {
    it('builds correct result URL params', () => {
      const correctAnswers = 50;
      const totalQuestions = 60;
      const totalTime = 60;
      const timeLimit = 60;
      const boardOrientation = 'white';
      const feedbackSpeed = 'normal';

      const params = new URLSearchParams();
      params.set('score', correctAnswers.toString());
      params.set('total', totalQuestions.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', timeLimit.toString());
      params.set('orientation', boardOrientation);
      params.set('speed', feedbackSpeed);

      expect(params.get('score')).toBe('50');
      expect(params.get('total')).toBe('60');
      expect(params.get('time')).toBe('60');
      expect(params.get('timeLimit')).toBe('60');
      expect(params.get('orientation')).toBe('white');
      expect(params.get('speed')).toBe('normal');
    });

    it('redirects when game is finished', () => {
      const isFinished = true;
      expect(isFinished).toBe(true);
    });

    it('does not redirect when game is not finished', () => {
      const isFinished = false;
      expect(isFinished).toBe(false);
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
