import { ok } from '@blindfold-chess/features/utils';
import { describe, expect, it, vi } from 'vitest';

import type { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/games/saved-game-types';

import { type GameSnapshot, persistGameSnapshot } from './persist-game-snapshot';

const CHARGE = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6071';

const snapshot: GameSnapshot = {
  moves: [],
  playerColor: 'white',
  engineConfig: { kind: 'maia', rating: 1500 },
  status: 'in_progress',
};

function repo(existing: Game | null) {
  const update = vi.fn().mockResolvedValue(ok(undefined));
  const create = vi.fn().mockResolvedValue(ok('new-id'));
  const load = vi.fn().mockResolvedValue(existing);
  return {
    repository: { update, create, load } as unknown as LocalStorageGameRepository,
    update,
    create,
  };
}

const stored: Game = { ...snapshot, id: 'g1', date: '2026-08-23T00:00:00.000Z' };

describe('persistGameSnapshot — the Maia charge a game was started on', () => {
  it('writes the charge from a fresh game snapshot', async () => {
    const { repository, create } = repo(null);
    await persistGameSnapshot(
      repository,
      { ...snapshot, maiaChargeId: CHARGE },
      { gameId: undefined, updateLastPlayed: true }
    );
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ maiaChargeId: CHARGE }));
  });

  it('keeps the stored charge when a resumed session saves without one', async () => {
    // A resumed game's URL has no charge param, so its snapshot carries none;
    // the charge is fixed for the game's life and must survive the update.
    const { repository, update } = repo({ ...stored, maiaChargeId: CHARGE });
    await persistGameSnapshot(repository, snapshot, { gameId: 'g1', updateLastPlayed: true });
    expect(update).toHaveBeenCalledWith(
      'g1',
      expect.objectContaining({ maiaChargeId: CHARGE }),
      expect.anything()
    );
  });

  it('leaves the charge undefined for a game that never had one', async () => {
    const { repository, update } = repo(stored);
    await persistGameSnapshot(repository, snapshot, { gameId: 'g1', updateLastPlayed: true });
    const [, written] = update.mock.calls[0];
    expect(written.maiaChargeId).toBeUndefined();
  });
});
