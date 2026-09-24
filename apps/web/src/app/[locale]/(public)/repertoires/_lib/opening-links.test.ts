import { describe, expect, it } from 'vitest';

import type { OpeningLinksAction, OpeningLinksState } from './opening-links';
import { INITIAL_OPENING_LINKS, openingLinksReducer } from './opening-links';

const AUTO: OpeningLinksState = { source: 'auto', ids: ['sicilian'] };
const MANUAL: OpeningLinksState = { source: 'manual', ids: ['french'] };

describe('openingLinksReducer', () => {
  it('starts auto-detecting with no links', () => {
    expect(INITIAL_OPENING_LINKS).toEqual({ source: 'auto', ids: [] });
  });

  describe('detected', () => {
    it('follows the PGN while auto-detecting', () => {
      expect(openingLinksReducer(AUTO, { type: 'detected', ids: ['najdorf'] })).toEqual({
        source: 'auto',
        ids: ['najdorf'],
      });
    });

    it('is ignored once the author has picked by hand', () => {
      expect(openingLinksReducer(MANUAL, { type: 'detected', ids: ['najdorf'] })).toBe(MANUAL);
    });

    it('returns the same state object when detection finds the same links', () => {
      expect(openingLinksReducer(AUTO, { type: 'detected', ids: ['sicilian'] })).toBe(AUTO);
    });
  });

  describe('picked', () => {
    it('hands the links to the author', () => {
      expect(openingLinksReducer(AUTO, { type: 'picked', ids: ['french'] })).toEqual({
        source: 'manual',
        ids: ['french'],
      });
    });

    it('keeps them manual when the author empties the picker', () => {
      expect(openingLinksReducer(MANUAL, { type: 'picked', ids: [] })).toEqual({
        source: 'manual',
        ids: [],
      });
    });

    it('stops a detection that lands after the pick from overwriting it', () => {
      const actions: OpeningLinksAction[] = [
        { type: 'picked', ids: ['french'] },
        { type: 'detected', ids: ['sicilian'] },
      ];
      const state = actions.reduce(openingLinksReducer, INITIAL_OPENING_LINKS);
      expect(state).toEqual({ source: 'manual', ids: ['french'] });
    });
  });

  describe('cleared', () => {
    it('empties the links and keeps auto-detecting', () => {
      expect(openingLinksReducer(AUTO, { type: 'cleared' })).toEqual({ source: 'auto', ids: [] });
    });

    it('empties the links and keeps a manual source manual', () => {
      expect(openingLinksReducer(MANUAL, { type: 'cleared' })).toEqual({
        source: 'manual',
        ids: [],
      });
    });

    it('returns the same state object when already empty', () => {
      expect(openingLinksReducer(INITIAL_OPENING_LINKS, { type: 'cleared' })).toBe(
        INITIAL_OPENING_LINKS
      );
    });
  });
});
