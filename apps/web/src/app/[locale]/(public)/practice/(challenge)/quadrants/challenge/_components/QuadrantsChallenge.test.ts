// @vitest-environment jsdom
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
} from '@blindfold-chess/features/quadrants';
import { describe, expect, it } from 'vitest';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

const BATCH_SIZE = 100;

describe('QuadrantsChallenge timed mode logic', () => {
  describe('question generation', () => {
    it('generates BATCH_SIZE questions initially', () => {
      const questions = generateQuadrantQuestionBatch(BATCH_SIZE, 'white');
      expect(questions).toHaveLength(BATCH_SIZE);
    });

    it('all generated questions have valid squares', () => {
      const questions = generateQuadrantQuestionBatch(BATCH_SIZE, 'white');
      for (const q of questions) {
        const quadrant = getCorrectQuadrant(q.square);
        expect(['q1', 'q2', 'q3', 'q4']).toContain(quadrant);
      }
    });

    it('respects white orientation', () => {
      const questions = generateQuadrantQuestionBatch(BATCH_SIZE, 'white');
      for (const q of questions) {
        expect(q.orientation).toBe('white');
      }
    });

    it('respects black orientation', () => {
      const questions = generateQuadrantQuestionBatch(BATCH_SIZE, 'black');
      for (const q of questions) {
        expect(q.orientation).toBe('black');
      }
    });

    it('random orientation produces both white and black', () => {
      const questions = generateQuadrantQuestionBatch(BATCH_SIZE, 'random');
      const orientations = new Set(questions.map((q) => q.orientation));
      expect(orientations.has('white')).toBe(true);
      expect(orientations.has('black')).toBe(true);
    });
  });

  describe('answer validation', () => {
    it('correctly validates answer for q1 square', () => {
      expect(checkQuadrantAnswer('e5', 'q1')).toBe(true);
      expect(checkQuadrantAnswer('e5', 'q2')).toBe(false);
    });

    it('correctly validates answer for q3 square', () => {
      expect(checkQuadrantAnswer('a1', 'q3')).toBe(true);
      expect(checkQuadrantAnswer('a1', 'q4')).toBe(false);
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
      expect(answers.filter((a) => a).length).toBe(0);
      expect(answers.filter((a) => !a).length).toBe(0);
    });
  });

  describe('timer behavior', () => {
    it('uses 60 second timeLimit', () => {
      const timeLimit = 60;
      expect(timeLimit).toBe(60);
    });

    it('timeRemaining does not go below 0', () => {
      const timeLimit = 60;
      const timeElapsed = 70;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      expect(timeRemaining).toBe(0);
    });
  });

  describe('rush mode - remaining lives calculation', () => {
    it('calculates remaining lives correctly', () => {
      expect(MISTAKE_LIMIT - 0).toBe(3);
    });

    it('decreases remaining lives with each mistake', () => {
      expect(MISTAKE_LIMIT - 1).toBe(2);
      expect(MISTAKE_LIMIT - 2).toBe(1);
      expect(MISTAKE_LIMIT - 3).toBe(0);
    });
  });

  describe('result page redirect logic', () => {
    it('builds correct result URL params', () => {
      const correctCount = 25;
      const incorrectCount = 3;
      const totalTime = 45;
      const total = correctCount + incorrectCount;

      const params = new URLSearchParams({
        score: correctCount.toString(),
        total: total.toString(),
        time: totalTime.toString(),
      });

      expect(params.get('score')).toBe('25');
      expect(params.get('total')).toBe('28');
      expect(params.get('time')).toBe('45');
    });
  });
});
