import { describe, expect, it } from 'vitest';

import {
  isViewingFinishedGame,
  shouldAutoSave,
  shouldMarkPendingChanges,
} from './auto-save-policy';

describe('isViewingFinishedGame', () => {
  it('is true when both the current and last-saved status are terminal', () => {
    expect(isViewingFinishedGame('win', 'win')).toBe(true);
    expect(isViewingFinishedGame('loss', 'draw')).toBe(true);
  });

  it('is false when the current status is still in progress', () => {
    expect(isViewingFinishedGame('in_progress', 'win')).toBe(false);
  });

  it('is false when the last-saved status was not terminal', () => {
    // The game just finished — it must still be saved once.
    expect(isViewingFinishedGame('win', 'in_progress')).toBe(false);
  });

  it('is false when neither status is terminal', () => {
    expect(isViewingFinishedGame('in_progress', 'in_progress')).toBe(false);
  });
});

describe('shouldAutoSave', () => {
  it('saves when a new move was made on a progressing game', () => {
    expect(
      shouldAutoSave({
        movesLength: 1,
        status: 'in_progress',
        lastSaved: { movesLength: 0, status: 'in_progress' },
        hasPlayerInteracted: false,
      })
    ).toBe(true);
  });

  it('saves when the status changed even if the move count is unchanged', () => {
    expect(
      shouldAutoSave({
        movesLength: 10,
        status: 'win',
        lastSaved: { movesLength: 10, status: 'in_progress' },
        hasPlayerInteracted: true,
      })
    ).toBe(true);
  });

  it('does not save when nothing changed', () => {
    expect(
      shouldAutoSave({
        movesLength: 5,
        status: 'in_progress',
        lastSaved: { movesLength: 5, status: 'in_progress' },
        hasPlayerInteracted: true,
      })
    ).toBe(false);
  });

  it('does not save an empty game the player has not interacted with', () => {
    // No moves yet and no interaction — nothing to persist.
    expect(
      shouldAutoSave({
        movesLength: 0,
        status: 'in_progress',
        lastSaved: { movesLength: 1, status: 'in_progress' },
        hasPlayerInteracted: false,
      })
    ).toBe(false);
  });

  it('saves an empty game once the player has interacted', () => {
    expect(
      shouldAutoSave({
        movesLength: 0,
        status: 'in_progress',
        lastSaved: { movesLength: 1, status: 'in_progress' },
        hasPlayerInteracted: true,
      })
    ).toBe(true);
  });

  it('never re-saves a game that was already finished when last saved', () => {
    // Viewing a finished game must not bump lastPlayed, even if moves differ.
    expect(
      shouldAutoSave({
        movesLength: 12,
        status: 'win',
        lastSaved: { movesLength: 11, status: 'win' },
        hasPlayerInteracted: true,
      })
    ).toBe(false);
  });
});

describe('shouldMarkPendingChanges', () => {
  it('marks pending changes for an in-progress game', () => {
    expect(shouldMarkPendingChanges('in_progress', { movesLength: 3, status: 'in_progress' })).toBe(
      true
    );
  });

  it('marks pending changes when a game transitions into a finished status', () => {
    expect(shouldMarkPendingChanges('win', { movesLength: 3, status: 'in_progress' })).toBe(true);
  });

  it('does not mark pending changes for a finished game whose status is unchanged', () => {
    expect(shouldMarkPendingChanges('draw', { movesLength: 3, status: 'draw' })).toBe(false);
  });
});
