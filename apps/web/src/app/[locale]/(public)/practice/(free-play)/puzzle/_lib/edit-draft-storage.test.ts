import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearEditDraft,
  editDraftStorageKey,
  readEditDraft,
  writeEditDraft,
} from './edit-draft-storage';
import type { PuzzleEditDraftV1 } from './edit-draft-storage';

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const POSITION_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_POSITION_ID = '22222222-2222-2222-2222-222222222222';

function makeDraft(overrides: Partial<PuzzleEditDraftV1> = {}): PuzzleEditDraftV1 {
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
    themeIds: [],
    chunkIds: [],
    ...overrides,
  };
}

describe('edit-draft-storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('writeEditDraft / readEditDraft (happy path)', () => {
    it('round-trips a minimal draft', () => {
      const draft = makeDraft();
      expect(writeEditDraft(POSITION_ID, draft)).toBe(true);
      expect(readEditDraft(POSITION_ID)).toEqual(draft);
    });

    it('round-trips a draft with moves, notes, and tags', () => {
      const draft = makeDraft({
        title: 'Mate in 1',
        description: 'Find the knight fork',
        moves: ['Nf3', 'e5'],
        notes: ['develop', ''],
        activeTab: 'fen',
        sideToMove: 'b',
        flipped: true,
        themeIds: ['theme-1'],
        chunkIds: ['chunk-1'],
      });
      expect(writeEditDraft(POSITION_ID, draft)).toBe(true);
      expect(readEditDraft(POSITION_ID)).toEqual(draft);
    });

    it('writes into the ID-scoped slot', () => {
      writeEditDraft(POSITION_ID, makeDraft({ title: 'slot check' }));
      const raw = sessionStorage.getItem(editDraftStorageKey(POSITION_ID));
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as PuzzleEditDraftV1;
      expect(parsed.title).toBe('slot check');
    });

    it('does not collide between two different positionIds', () => {
      writeEditDraft(POSITION_ID, makeDraft({ title: 'first puzzle' }));
      writeEditDraft(OTHER_POSITION_ID, makeDraft({ title: 'second puzzle' }));

      expect(readEditDraft(POSITION_ID)?.title).toBe('first puzzle');
      expect(readEditDraft(OTHER_POSITION_ID)?.title).toBe('second puzzle');

      clearEditDraft(POSITION_ID);
      expect(readEditDraft(POSITION_ID)).toBeNull();
      expect(readEditDraft(OTHER_POSITION_ID)?.title).toBe('second puzzle');
    });
  });

  describe('readEditDraft (empty / corrupt payloads)', () => {
    it('returns null when nothing is stored', () => {
      expect(readEditDraft(POSITION_ID)).toBeNull();
    });

    it('returns null and clears the slot when JSON is malformed', () => {
      sessionStorage.setItem(editDraftStorageKey(POSITION_ID), '{not-json');
      expect(readEditDraft(POSITION_ID)).toBeNull();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });

    it('returns null and clears the slot when version is not 1', () => {
      sessionStorage.setItem(
        editDraftStorageKey(POSITION_ID),
        JSON.stringify({ ...makeDraft(), version: 2 })
      );
      expect(readEditDraft(POSITION_ID)).toBeNull();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });

    it('returns null and clears the slot when a required field is missing', () => {
      const partial = { ...makeDraft() } as Partial<PuzzleEditDraftV1>;
      delete partial.title;
      sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(partial));
      expect(readEditDraft(POSITION_ID)).toBeNull();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });

    it('returns null and clears the slot when themeIds/chunkIds are missing', () => {
      const partial = { ...makeDraft() } as Partial<PuzzleEditDraftV1>;
      delete partial.themeIds;
      sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(partial));
      expect(readEditDraft(POSITION_ID)).toBeNull();
    });

    it('returns null and clears the slot when the stored FEN is invalid', () => {
      sessionStorage.setItem(
        editDraftStorageKey(POSITION_ID),
        JSON.stringify(makeDraft({ fen: 'not a fen' }))
      );
      expect(readEditDraft(POSITION_ID)).toBeNull();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });
  });

  describe('writeEditDraft (failures)', () => {
    it('returns false when sessionStorage.setItem throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(writeEditDraft(POSITION_ID, makeDraft())).toBe(false);
      spy.mockRestore();
    });
  });

  describe('readEditDraft (sessionStorage throws)', () => {
    it('returns null when sessionStorage.getItem throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      expect(readEditDraft(POSITION_ID)).toBeNull();
      spy.mockRestore();
    });
  });

  describe('clearEditDraft', () => {
    it('removes an existing draft', () => {
      writeEditDraft(POSITION_ID, makeDraft());
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).not.toBeNull();
      clearEditDraft(POSITION_ID);
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });

    it('is a no-op when nothing is stored', () => {
      expect(() => clearEditDraft(POSITION_ID)).not.toThrow();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
    });

    it('swallows sessionStorage.removeItem errors', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      expect(() => clearEditDraft(POSITION_ID)).not.toThrow();
      spy.mockRestore();
    });
  });
});
