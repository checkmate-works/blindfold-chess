import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_STORAGE_KEY, clearDraft, readDraft, writeDraft } from './draft-storage';
import type { PuzzleDraftV1 } from './draft-storage';

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeDraft(overrides: Partial<PuzzleDraftV1> = {}): PuzzleDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Test puzzle',
    description: '',
    moves: [],
    notes: [],
    activeTab: 'board',
    sideToMove: 'w',
    flipped: false,
    userFlipped: false,
    ...overrides,
  };
}

describe('draft-storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('writeDraft / readDraft (happy path)', () => {
    it('round-trips a minimal draft', () => {
      const draft = makeDraft();
      expect(writeDraft(draft)).toBe(true);
      expect(readDraft()).toEqual(draft);
    });

    it('round-trips a draft with moves and notes', () => {
      const draft = makeDraft({
        title: 'Mate in 1',
        description: 'Find the knight fork',
        moves: ['Nf3', 'e5'],
        notes: ['develop', ''],
        activeTab: 'fen',
        sideToMove: 'b',
        flipped: true,
        userFlipped: true,
      });
      expect(writeDraft(draft)).toBe(true);
      expect(readDraft()).toEqual(draft);
    });

    it('writes into the expected slot', () => {
      writeDraft(makeDraft({ title: 'slot check' }));
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as PuzzleDraftV1;
      expect(parsed.title).toBe('slot check');
    });
  });

  describe('readDraft (empty / corrupt payloads)', () => {
    it('returns null when nothing is stored', () => {
      expect(readDraft()).toBeNull();
    });

    it('returns null and clears the slot when JSON is malformed', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, '{not-json');
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('returns null and clears the slot when version is not 1', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...makeDraft(), version: 2 }));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('returns null and clears the slot when a required field is missing', () => {
      const partial = { ...makeDraft() } as Partial<PuzzleDraftV1>;
      delete partial.title;
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(partial));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('returns null and clears the slot when moves contains non-strings', () => {
      const bad = { ...makeDraft(), moves: ['Nf3', 42] };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(bad));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('returns null and clears the slot when activeTab is unknown', () => {
      const bad = { ...makeDraft(), activeTab: 'other' };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(bad));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('returns null and clears the slot when the stored FEN is invalid', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft({ fen: 'not a fen' })));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('rejects forkedFromId when present but not a string', () => {
      // Optional field, but if it is present its shape must match. Anything
      // non-string here means a buggy producer wrote the slot and the safe
      // recovery is to drop the whole draft.
      const bad = { ...makeDraft(), forkedFromId: 42 };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(bad));
      expect(readDraft()).toBeNull();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('forkedFromId round-trip', () => {
    it('preserves forkedFromId on round-trip', () => {
      const draft = makeDraft({ forkedFromId: '11111111-1111-1111-1111-111111111111' });
      expect(writeDraft(draft)).toBe(true);
      expect(readDraft()).toEqual(draft);
    });

    it('hydrates legacy drafts (no forkedFromId field) cleanly', () => {
      // Drafts written before fork support landed do not carry the field at
      // all; readDraft must accept them and return forkedFromId === undefined.
      const draft = makeDraft();
      expect(writeDraft(draft)).toBe(true);
      const recovered = readDraft();
      expect(recovered).not.toBeNull();
      expect(recovered!.forkedFromId).toBeUndefined();
    });
  });

  describe('writeDraft (failures)', () => {
    it('returns false when sessionStorage.setItem throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(writeDraft(makeDraft())).toBe(false);
      spy.mockRestore();
    });
  });

  describe('readDraft (sessionStorage throws)', () => {
    it('returns null when sessionStorage.getItem throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      expect(readDraft()).toBeNull();
      spy.mockRestore();
    });
  });

  describe('clearDraft', () => {
    it('removes an existing draft', () => {
      writeDraft(makeDraft());
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
      clearDraft();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('is a no-op when nothing is stored', () => {
      expect(() => clearDraft()).not.toThrow();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('swallows sessionStorage.removeItem errors', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      expect(() => clearDraft()).not.toThrow();
      spy.mockRestore();
    });
  });
});
