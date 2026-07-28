import { describe, expect, it } from 'vitest';

import { resolveTermination } from './termination';

describe('resolveTermination', () => {
  it('returns null while the game is still being played', () => {
    expect(resolveTermination('in_progress', 'in_progress')).toBeNull();
  });

  it('reports a checkmate the position itself justifies', () => {
    expect(resolveTermination('checkmate', 'checkmate')).toBe('checkmate');
  });

  it('reports a resignation when the stored status outruns the position', () => {
    // handleResign stamps 'checkmate' onto a position that is still playable.
    expect(resolveTermination('checkmate', 'in_progress')).toBe('resignation');
  });

  it('passes stalemate and draw through', () => {
    expect(resolveTermination('stalemate', 'stalemate')).toBe('stalemate');
    expect(resolveTermination('draw', 'draw')).toBe('draw');
  });

  it('recovers a reloaded stalemate that persistence flattened into a draw', () => {
    expect(resolveTermination('draw', 'stalemate')).toBe('stalemate');
  });

  it('recovers a reloaded checkmate the stored status rounded off', () => {
    expect(resolveTermination('draw', 'checkmate')).toBe('checkmate');
  });
});
