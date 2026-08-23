import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import { getExpHeatmapData } from './getExpHeatmapData';

vi.mock('@/lib/db', async () => {
  const mockDb = {
    select: vi.fn(),
  };
  return {
    ...(await actualDbSchema()),
    db: mockDb,
  };
});

const { db } = await import('@/lib/db');
const mockDb = vi.mocked(db);

describe('getExpHeatmapData', () => {
  const mockGroupBy = vi.fn();
  const mockWhere = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    // Each call to db.select() creates a new chain.
    // First call: daily totals. Second call: module breakdown.
    let callCount = 0;
    const dailyGroupBy = vi.fn().mockResolvedValue([
      { date: '2026-04-01', total: '150' },
      { date: '2026-04-02', total: '75' },
    ]);
    const moduleGroupBy = vi.fn().mockResolvedValue([
      { date: '2026-04-01', menuType: 'coordinate_quiz', total: '100' },
      { date: '2026-04-01', menuType: 'legal_moves', total: '50' },
      { date: '2026-04-02', menuType: 'coordinate_quiz', total: '75' },
    ]);

    mockGroupBy.mockImplementation((...args) => {
      callCount++;
      if (callCount <= 1) return dailyGroupBy(...args);
      return moduleGroupBy(...args);
    });
    mockWhere.mockReturnValue({ groupBy: mockGroupBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockDb.select.mockReturnValue({ from: mockFrom } as never);
  });

  it('returns daily totals and module breakdowns', async () => {
    const result = await getExpHeatmapData('user-123');

    expect(result.daily).toEqual({
      '2026-04-01': 150,
      '2026-04-02': 75,
    });
    expect(result.dailyByModule).toEqual({
      '2026-04-01': { coordinate_quiz: 100, legal_moves: 50 },
      '2026-04-02': { coordinate_quiz: 75 },
    });
  });

  it('calls db.select twice (daily + module)', async () => {
    await getExpHeatmapData('user-123');

    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockWhere).toHaveBeenCalledTimes(2);
    expect(mockGroupBy).toHaveBeenCalledTimes(2);
  });

  it('returns empty objects when no data exists', async () => {
    mockGroupBy.mockResolvedValue([]);

    const result = await getExpHeatmapData('user-123');

    expect(result.daily).toEqual({});
    expect(result.dailyByModule).toEqual({});
  });

  it('handles null total gracefully', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: '2026-04-01', total: null }])
      .mockResolvedValueOnce([{ date: '2026-04-01', menuType: 'coordinate_quiz', total: null }]);

    const result = await getExpHeatmapData('user-123');

    expect(result.daily).toEqual({ '2026-04-01': 0 });
    expect(result.dailyByModule).toEqual({ '2026-04-01': { coordinate_quiz: 0 } });
  });

  it('handles null menuType as "unknown"', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: '2026-04-01', total: '100' }])
      .mockResolvedValueOnce([{ date: '2026-04-01', menuType: null, total: '100' }]);

    const result = await getExpHeatmapData('user-123');

    expect(result.dailyByModule).toEqual({ '2026-04-01': { unknown: 100 } });
  });

  it('handles total of string "0" correctly', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: '2026-04-01', total: '0' }])
      .mockResolvedValueOnce([]);

    const result = await getExpHeatmapData('user-123');

    expect(result.daily).toEqual({ '2026-04-01': 0 });
  });

  it('propagates database errors', async () => {
    mockGroupBy.mockRejectedValue(new Error('Connection refused'));

    await expect(getExpHeatmapData('user-123')).rejects.toThrow('Connection refused');
  });

  it('handles non-string date by formatting it', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: new Date('2026-04-01T00:00:00Z'), total: '50' }])
      .mockResolvedValueOnce([]);

    const result = await getExpHeatmapData('user-123');

    expect(result.daily).toEqual({ '2026-04-01': 50 });
  });

  it('propagates error when only the first query (daily) fails', async () => {
    mockGroupBy.mockRejectedValueOnce(new Error('daily query failed')).mockResolvedValueOnce([]);

    await expect(getExpHeatmapData('user-123')).rejects.toThrow('daily query failed');
  });

  it('propagates error when only the second query (module) fails', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: '2026-04-01', total: '100' }])
      .mockRejectedValueOnce(new Error('module query failed'));

    await expect(getExpHeatmapData('user-123')).rejects.toThrow();
  });

  it('handles non-string date in moduleRows by formatting it', async () => {
    mockGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { date: new Date('2026-04-01T00:00:00Z'), menuType: 'legal_moves', total: '80' },
      ]);

    const result = await getExpHeatmapData('user-123');

    expect(result.dailyByModule).toEqual({ '2026-04-01': { legal_moves: 80 } });
  });

  it('handles undefined menuType as "unknown"', async () => {
    mockGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ date: '2026-04-01', menuType: undefined, total: '50' }]);

    const result = await getExpHeatmapData('user-123');

    expect(result.dailyByModule).toEqual({ '2026-04-01': { unknown: 50 } });
  });

  it('aggregates multiple modules for the same date correctly', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ date: '2026-04-01', total: '300' }])
      .mockResolvedValueOnce([
        { date: '2026-04-01', menuType: 'coordinate_quiz', total: '100' },
        { date: '2026-04-01', menuType: 'legal_moves', total: '120' },
        { date: '2026-04-01', menuType: 'diagonal_quiz', total: '80' },
      ]);

    const result = await getExpHeatmapData('user-123');

    expect(result.dailyByModule['2026-04-01']).toEqual({
      coordinate_quiz: 100,
      legal_moves: 120,
      diagonal_quiz: 80,
    });
    expect(Object.keys(result.dailyByModule['2026-04-01']!)).toHaveLength(3);
  });

  it('executes both queries via Promise.all (parallel execution)', async () => {
    const callOrder: string[] = [];

    mockGroupBy
      .mockImplementationOnce(() => {
        callOrder.push('daily-start');
        return Promise.resolve([{ date: '2026-04-01', total: '50' }]).then((r) => {
          callOrder.push('daily-end');
          return r;
        });
      })
      .mockImplementationOnce(() => {
        callOrder.push('module-start');
        return Promise.resolve([]).then((r) => {
          callOrder.push('module-end');
          return r;
        });
      });

    await getExpHeatmapData('user-123');

    // Both queries should start before either resolves
    expect(callOrder[0]).toBe('daily-start');
    expect(callOrder[1]).toBe('module-start');
  });
});
