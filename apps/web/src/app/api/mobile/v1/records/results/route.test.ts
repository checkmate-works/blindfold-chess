import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
}));
vi.mock('server-only', () => ({}));

const listAvailableMenuTypes = vi.fn();
vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/dashboard-queries', () => ({
  listAvailableMenuTypes: (...args: unknown[]) => listAvailableMenuTypes(...args),
}));
const getChallengeResultsPaginated = vi.fn();
const getLatestLeaderboardKey = vi.fn();
vi.mock('@/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/queries', () => ({
  getChallengeResultsPaginated: (...args: unknown[]) => getChallengeResultsPaginated(...args),
  getLatestLeaderboardKey: (...args: unknown[]) => getLatestLeaderboardKey(...args),
}));

const get = (query: string) =>
  GET(
    new Request(`http://localhost/api/mobile/v1/records/results?${query}`, {
      headers: { Authorization: 'Bearer t' },
    })
  );

describe('GET /api/mobile/v1/records/results', () => {
  beforeEach(() => {
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
    listAvailableMenuTypes.mockReset().mockResolvedValue(['coordinate_quiz', 'square_colors']);
    getChallengeResultsPaginated.mockReset().mockResolvedValue({ items: [], totalPages: 3 });
    getLatestLeaderboardKey.mockReset().mockResolvedValue('black');
  });

  it('lists every menu when no menu is given, ignoring a key on its own', async () => {
    const response = await get('page=2&key=white');

    expect(await response.json()).toEqual({
      items: [],
      page: 2,
      totalPages: 3,
      menu: null,
      key: null,
      availableMenuTypes: ['coordinate_quiz', 'square_colors'],
    });
    expect(getChallengeResultsPaginated).toHaveBeenCalledWith('u1', 2, undefined, undefined);
  });

  it('follows the most recent key of a keyed menu when no key is given', async () => {
    const body = await (await get('menu=coordinate_quiz')).json();

    expect(body.key).toBe('black');
    expect(getChallengeResultsPaginated).toHaveBeenCalledWith('u1', 1, 'coordinate_quiz', 'black');
  });

  it('keeps the given key, and gives an unkeyed menu none', async () => {
    await get('menu=coordinate_quiz&key=white');
    expect(getChallengeResultsPaginated).toHaveBeenLastCalledWith(
      'u1',
      1,
      'coordinate_quiz',
      'white'
    );

    await get('menu=square_colors');
    expect(getChallengeResultsPaginated).toHaveBeenLastCalledWith(
      'u1',
      1,
      'square_colors',
      undefined
    );
    expect(getLatestLeaderboardKey).not.toHaveBeenCalled();
  });

  it('reads a bad page number as the first page', async () => {
    await get('page=abc');
    expect(getChallengeResultsPaginated).toHaveBeenCalledWith('u1', 1, undefined, undefined);
  });
});
