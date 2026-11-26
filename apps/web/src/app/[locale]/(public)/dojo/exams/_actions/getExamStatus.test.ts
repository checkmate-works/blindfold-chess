import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getOptionalUser as mockGetOptionalUser } from '@/lib/__mocks__/auth';

const mockGetCompletedSteps = vi.fn();
const mockGetAchievedSlugs = vi.fn();

vi.mock('@/lib/auth');
vi.mock('@/lib/dojo/step-completions', () => ({
  getCompletedSteps: (...args: unknown[]) => mockGetCompletedSteps(...args),
}));
vi.mock('@/app/[locale]/(public)/dojo/ranks/_lib/queries', () => ({
  getAchievedSlugsForUser: (...args: unknown[]) => mockGetAchievedSlugs(...args),
}));

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';

const { getExamStatus } = await import('./getExamStatus');

describe('getExamStatus', () => {
  beforeEach(() => {
    mockGetOptionalUser.mockReset();
    mockGetCompletedSteps.mockReset();
    mockGetAchievedSlugs.mockReset();
    mockGetOptionalUser.mockResolvedValue({ id: USER_ID });
    mockGetCompletedSteps.mockResolvedValue([]);
    mockGetAchievedSlugs.mockResolvedValue(new Set());
  });

  it('reads nothing personal for a signed-out viewer', async () => {
    mockGetOptionalUser.mockResolvedValue(null);

    expect(await getExamStatus('2kyu')).toEqual({ signedIn: false });
    expect(mockGetCompletedSteps).not.toHaveBeenCalled();
  });

  it('lists the problems already passed on record, ignoring other steps', async () => {
    mockGetCompletedSteps.mockResolvedValue(['exam:2kyu:puzzle', 'guide:2kyu:read']);
    mockGetAchievedSlugs.mockResolvedValue(new Set(['3kyu']));

    expect(await getExamStatus('2kyu')).toEqual({
      signedIn: true,
      solved: ['puzzle'],
      eligible: true,
    });
  });

  it('records a pass for a player holding the rank right below the exam', async () => {
    mockGetAchievedSlugs.mockResolvedValue(new Set(['5kyu', '4kyu', '3kyu']));

    expect(await getExamStatus('2kyu')).toMatchObject({ eligible: true });
  });

  it('records a pass for a player who already holds the exam rank', async () => {
    mockGetAchievedSlugs.mockResolvedValue(new Set(['2kyu']));

    expect(await getExamStatus('2kyu')).toMatchObject({ eligible: true });
  });

  it('does not record a pass for a player who would skip a rank to reach it', async () => {
    mockGetAchievedSlugs.mockResolvedValue(new Set(['5kyu']));

    expect(await getExamStatus('2kyu')).toMatchObject({ signedIn: true, eligible: false });
  });

  it('treats a rank without an exam as nothing solved and nothing recordable', async () => {
    expect(await getExamStatus('5kyu')).toEqual({ signedIn: true, solved: [], eligible: false });
    expect(mockGetCompletedSteps).not.toHaveBeenCalled();
  });
});
