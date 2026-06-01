import { beforeEach, describe, expect, it } from 'vitest';

import {
  getSharedGame,
  getSharedGameIds,
  recordSharedGame,
  removeSharedGame,
} from './shared-game-store';

describe('shared-game-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records and reads back a published mapping with token', () => {
    recordSharedGame('local-1', 'pub-1', 'tok-1');
    expect(getSharedGame('local-1')).toEqual({ publishedId: 'pub-1', manageToken: 'tok-1' });
  });

  it('omits the token for registered authors', () => {
    recordSharedGame('local-1', 'pub-1');
    expect(getSharedGame('local-1')).toEqual({ publishedId: 'pub-1' });
  });

  it('returns null for an unshared game', () => {
    expect(getSharedGame('missing')).toBeNull();
  });

  it('accumulates multiple games', () => {
    recordSharedGame('local-1', 'pub-1');
    recordSharedGame('local-2', 'pub-2', 'tok-2');
    expect(getSharedGameIds().sort()).toEqual(['local-1', 'local-2']);
  });

  it('removes a mapping', () => {
    recordSharedGame('local-1', 'pub-1');
    removeSharedGame('local-1');
    expect(getSharedGame('local-1')).toBeNull();
  });

  it('survives corrupted storage without throwing', () => {
    window.localStorage.setItem('blindfold_chess_shared_games', 'not json');
    expect(getSharedGame('local-1')).toBeNull();
    recordSharedGame('local-1', 'pub-1');
    expect(getSharedGame('local-1')).toEqual({ publishedId: 'pub-1' });
  });
});
