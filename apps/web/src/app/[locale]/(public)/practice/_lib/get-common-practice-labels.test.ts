import { describe, expect, it, vi } from 'vitest';

import { getCommonPracticeCompleteLabels } from './get-common-practice-labels';

describe('getCommonPracticeCompleteLabels', () => {
  const mockT = vi.fn((key: string) => `translated_${key}`);

  it('returns exactly the 5 expected keys', () => {
    const result = getCommonPracticeCompleteLabels(mockT);
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(
      ['morePractice', 'practiceComplete', 'relatedLearning', 'score', 'tryAgain'].sort()
    );
  });

  it('calls the translation function with the correct keys', () => {
    mockT.mockClear();
    getCommonPracticeCompleteLabels(mockT);
    expect(mockT).toHaveBeenCalledTimes(5);
    expect(mockT).toHaveBeenCalledWith('practiceComplete');
    expect(mockT).toHaveBeenCalledWith('result');
    expect(mockT).toHaveBeenCalledWith('tryAgain');
    expect(mockT).toHaveBeenCalledWith('changeSettings');
    expect(mockT).toHaveBeenCalledWith('relatedLearning');
  });

  it('maps morePractice to the changeSettings translation key', () => {
    const result = getCommonPracticeCompleteLabels(mockT);
    expect(result.morePractice).toBe('translated_changeSettings');
  });

  it('returns the translated values for each key', () => {
    const result = getCommonPracticeCompleteLabels(mockT);
    expect(result).toEqual({
      practiceComplete: 'translated_practiceComplete',
      score: 'translated_result',
      tryAgain: 'translated_tryAgain',
      morePractice: 'translated_changeSettings',
      relatedLearning: 'translated_relatedLearning',
    });
  });

  it('uses the actual return values from the translation function', () => {
    const customT = (key: string) => {
      const translations: Record<string, string> = {
        practiceComplete: 'Practice Complete!',
        result: 'Result',
        tryAgain: 'Try Again',
        changeSettings: 'More Practice',
        relatedLearning: 'Related Learning',
      };
      return translations[key] ?? key;
    };
    const result = getCommonPracticeCompleteLabels(customT);
    expect(result.practiceComplete).toBe('Practice Complete!');
    expect(result.score).toBe('Result');
    expect(result.tryAgain).toBe('Try Again');
    expect(result.morePractice).toBe('More Practice');
    expect(result.relatedLearning).toBe('Related Learning');
  });
});
