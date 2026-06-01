import { beforeEach, describe, expect, it } from 'vitest';

import {
  getPublishedGameIds,
  getPublishedToken,
  removePublishedToken,
  storePublishedToken,
} from './published-token-store';

describe('published-token-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and reads back a token by published game id', () => {
    storePublishedToken('game-1', 'tok-1');
    expect(getPublishedToken('game-1')).toBe('tok-1');
  });

  it('returns null for an unknown id', () => {
    expect(getPublishedToken('missing')).toBeNull();
  });

  it('accumulates multiple games', () => {
    storePublishedToken('game-1', 'tok-1');
    storePublishedToken('game-2', 'tok-2');
    expect(getPublishedGameIds().sort()).toEqual(['game-1', 'game-2']);
  });

  it('removes a token', () => {
    storePublishedToken('game-1', 'tok-1');
    removePublishedToken('game-1');
    expect(getPublishedToken('game-1')).toBeNull();
  });

  it('survives corrupted storage without throwing', () => {
    window.localStorage.setItem('blindfold_chess_published_tokens', 'not json');
    expect(getPublishedToken('game-1')).toBeNull();
    storePublishedToken('game-1', 'tok-1'); // overwrites the garbage
    expect(getPublishedToken('game-1')).toBe('tok-1');
  });
});
