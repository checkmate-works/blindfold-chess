import { describe, expect, it } from 'vitest';

import {
  playSettingsDisplayAtHalfMove,
  playSettingsToThumbnailDisplay,
} from './play-settings-thumbnail';
import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

/** A fully-sighted standard game: nothing to reflect on the thumbnail. */
const SIGHTED: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

describe('playSettingsToThumbnailDisplay', () => {
  it('returns null for a legacy game with no snapshot', () => {
    expect(playSettingsToThumbnailDisplay(null, 'white')).toBeNull();
    expect(playSettingsToThumbnailDisplay(undefined, 'white')).toBeNull();
  });

  it('returns null for a fully-sighted standard game (nothing to reflect)', () => {
    expect(playSettingsToThumbnailDisplay(SIGHTED, 'white')).toBeNull();
  });

  it('anchors ownColor to the side the author played', () => {
    const white = playSettingsToThumbnailDisplay(
      { ...SIGHTED, pieceColors: 'white-only' },
      'white'
    );
    const black = playSettingsToThumbnailDisplay(
      { ...SIGHTED, pieceColors: 'white-only' },
      'black'
    );
    expect(white?.ownColor).toBe('w');
    expect(black?.ownColor).toBe('b');
  });

  it('folds a hidden whole board (never) into hide-both-sides with ghost styling', () => {
    const result = playSettingsToThumbnailDisplay(
      { ...SIGHTED, boardVisibility: 'never' },
      'white'
    );
    expect(result).toMatchObject({
      showOwnPieces: false,
      showOpponentPieces: false,
      hiddenPieceStyle: 'ghost',
    });
  });

  it('folds a peek board into hidden while keeping pieceShapeMode for the faint stone', () => {
    const result = playSettingsToThumbnailDisplay(
      {
        ...SIGHTED,
        boardVisibility: 'peek',
        showOwnPieces: true,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-own',
      },
      'white'
    );
    expect(result).toMatchObject({
      showOwnPieces: false,
      showOpponentPieces: false,
      // Survives the hide: `resolvePieceDisplay` renders it as a faint stone
      // rather than flattening it into a ghost piece.
      pieceShapeMode: 'circles-own',
      hiddenPieceStyle: 'ghost',
    });
  });

  it('passes through per-piece obfuscation on an always-visible board', () => {
    const result = playSettingsToThumbnailDisplay(
      { ...SIGHTED, pieceShapeMode: 'circles-all', pieceColors: 'white-only' },
      'white'
    );
    expect(result).toMatchObject({
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-all',
      pieceColors: 'white-only',
      hiddenPieceStyle: 'ghost',
    });
  });
});

describe('playSettingsDisplayAtHalfMove', () => {
  it('returns null for a legacy game with no snapshot', () => {
    expect(playSettingsDisplayAtHalfMove(null, null, 'white', 4)).toBeNull();
    expect(playSettingsDisplayAtHalfMove(undefined, undefined, 'white', 4)).toBeNull();
  });

  it('returns null for a fully-sighted standard game with no log (nothing to reflect)', () => {
    expect(playSettingsDisplayAtHalfMove(SIGHTED, null, 'white', 4)).toBeNull();
  });

  it('reflects a mid-game reveal from the moment it happens, not before', () => {
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 4, key: 'boardVisibility', to: 'always' },
    ];
    const before = playSettingsDisplayAtHalfMove(
      { ...SIGHTED, boardVisibility: 'never' },
      log,
      'white',
      3
    );
    const after = playSettingsDisplayAtHalfMove(
      { ...SIGHTED, boardVisibility: 'never' },
      log,
      'white',
      4
    );
    expect(before).toMatchObject({ showOwnPieces: false, showOpponentPieces: false });
    expect(after).toMatchObject({ showOwnPieces: true, showOpponentPieces: true });
  });

  it('is not null for a plain start later hidden mid-game (gate regression)', () => {
    // playSettingsAreNotable(SIGHTED) is false, but the log makes the game
    // notable overall — must not fall back to null via the snapshot-only gate.
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 2, key: 'boardVisibility', to: 'never' },
    ];
    const atStart = playSettingsDisplayAtHalfMove(SIGHTED, log, 'white', 0);
    const afterHide = playSettingsDisplayAtHalfMove(SIGHTED, log, 'white', 2);
    expect(atStart).not.toBeNull();
    expect(atStart).toMatchObject({ showOwnPieces: true, showOpponentPieces: true });
    expect(afterHide).toMatchObject({ showOwnPieces: false, showOpponentPieces: false });
  });

  it('treats a peek board as hidden — between peeks the player saw nothing', () => {
    const peekBoard: GamePlaySettings = {
      ...SIGHTED,
      boardVisibility: 'peek',
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-own',
    };
    const atPosition = playSettingsDisplayAtHalfMove(peekBoard, null, 'white', 0);
    expect(atPosition).toMatchObject({
      showOwnPieces: false,
      showOpponentPieces: false,
      hiddenPieceStyle: 'ghost',
    });

    // Every "as played" surface agrees on what hidden means, so the
    // single-image fold resolves identically.
    expect(playSettingsToThumbnailDisplay(peekBoard, 'white')).toEqual(atPosition);
  });
});
