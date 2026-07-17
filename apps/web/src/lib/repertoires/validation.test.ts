import { describe, expect, it } from 'vitest';

import { REPERTOIRE_ANNOTATION_MAX, validateRepertoireImport } from './validation';

const BASE = {
  name: 'Test kata',
  side: 'white' as const,
  phase: 'opening' as const,
  pgn: '1. e4 e5 2. Nf3',
};

const KEY = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -';

describe('validateRepertoireImport — annotations', () => {
  it('passes cleaned notes through, dropping whitespace-only drafts', () => {
    const result = validateRepertoireImport({
      ...BASE,
      annotations: { [KEY]: '  Grabs the center. ', 'other-key': '   ' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.annotations).toEqual([{ positionKey: KEY, text: 'Grabs the center.' }]);
    }
  });

  it('defaults to no annotations', () => {
    const result = validateRepertoireImport(BASE);
    expect(result.ok && result.data.annotations).toEqual([]);
  });

  it('rejects an over-long note', () => {
    const result = validateRepertoireImport({
      ...BASE,
      annotations: { [KEY]: 'x'.repeat(REPERTOIRE_ANNOTATION_MAX + 1) },
    });
    expect(result).toEqual({ ok: false, error: 'invalidAnnotations' });
  });

  it('rejects an oversized position key', () => {
    const result = validateRepertoireImport({
      ...BASE,
      annotations: { ['k'.repeat(200)]: 'note' },
    });
    expect(result).toEqual({ ok: false, error: 'invalidAnnotations' });
  });

  it('merges shapes with a note on the same position and drops malformed markup', () => {
    const circle = { circles: [{ square: 'e4', color: 'green' }], arrows: [] };
    const result = validateRepertoireImport({
      ...BASE,
      annotations: { [KEY]: 'Grabs the center.' },
      shapes: { [KEY]: circle, other: { not: 'markup' } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.annotations).toHaveLength(1);
      const entry = result.data.annotations[0];
      expect(entry.positionKey).toBe(KEY);
      expect(entry.text).toBe('Grabs the center.');
      expect(entry.shapes?.circles).toHaveLength(1);
    }
  });
});
