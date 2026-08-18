import { afterEach, describe, expect, it, vi } from 'vitest';

import { importLichessGame } from './importLichessGame';

const fetchLichessGamePgnMock = vi.fn();
vi.mock('@/lib/games/lichess', () => ({
  fetchLichessGamePgn: (...args: unknown[]) => fetchLichessGamePgnMock(...args),
}));

describe('importLichessGame', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts the game id from a plain Lichess game URL and returns the fetched PGN', async () => {
    fetchLichessGamePgnMock.mockResolvedValue({
      ok: true,
      pgn: '[Event "Test"]\n\n1. e4 e5',
      canonicalUrl: 'https://lichess.org/abcd1234',
    });

    const result = await importLichessGame('https://lichess.org/abcd1234');

    expect(fetchLichessGamePgnMock).toHaveBeenCalledWith('abcd1234');
    expect(result).toEqual({ ok: true, pgn: '[Event "Test"]\n\n1. e4 e5' });
  });

  it('extracts the game id from a Lichess embed URL', async () => {
    fetchLichessGamePgnMock.mockResolvedValue({
      ok: true,
      pgn: '[Event "Test"]\n\n1. e4 e5',
      canonicalUrl: 'https://lichess.org/abcd1234',
    });

    const result = await importLichessGame('https://lichess.org/embed/game/abcd1234');

    expect(fetchLichessGamePgnMock).toHaveBeenCalledWith('abcd1234');
    expect(result).toEqual({ ok: true, pgn: '[Event "Test"]\n\n1. e4 e5' });
  });

  it('rejects a Lichess study URL as lichess_unsupported without calling the fetcher', async () => {
    const result = await importLichessGame('https://lichess.org/study/abcd1234');

    expect(fetchLichessGamePgnMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'lichess_unsupported' });
  });

  it('rejects a non-Lichess URL as not_lichess_url without calling the fetcher', async () => {
    const result = await importLichessGame('https://example.com/whatever');

    expect(fetchLichessGamePgnMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'not_lichess_url' });
  });

  it('relays a fetch failure error from fetchLichessGamePgn', async () => {
    fetchLichessGamePgnMock.mockResolvedValue({ ok: false, error: 'not_found' });

    const result = await importLichessGame('https://lichess.org/abcd1234');

    expect(result).toEqual({ ok: false, error: 'not_found' });
  });
});
