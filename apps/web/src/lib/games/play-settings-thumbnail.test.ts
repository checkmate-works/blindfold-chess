import { describe, expect, it } from 'vitest';

import { playSettingsToThumbnailDisplay } from './play-settings-thumbnail';
import type { GamePlaySettings } from './saved-game-types';

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

  it('treats a peek board the same as never (player saw no pieces at the opening)', () => {
    const result = playSettingsToThumbnailDisplay({ ...SIGHTED, boardVisibility: 'peek' }, 'white');
    expect(result?.showOwnPieces).toBe(false);
    expect(result?.showOpponentPieces).toBe(false);
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
