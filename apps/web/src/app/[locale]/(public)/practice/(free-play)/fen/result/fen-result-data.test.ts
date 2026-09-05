import { describe, expect, it } from 'vitest';

import { parseFenResultData } from './fen-result-data';

describe('parseFenResultData', () => {
  it('decodes the complete result payload', () => {
    const payload = {
      score: 2,
      total: 3,
      detailedStats: { correct: 2, incorrect: 1, total: 3 },
      results: [{ square: 'a1' }],
    };

    expect(parseFenResultData(encodeURIComponent(JSON.stringify(payload)))).toEqual(payload);
  });

  it.each([null, '', '%E0%A4%A', 'not-json'])(
    'returns null for absent or invalid data: %s',
    (data) => {
      expect(parseFenResultData(data)).toBeNull();
    }
  );
});
