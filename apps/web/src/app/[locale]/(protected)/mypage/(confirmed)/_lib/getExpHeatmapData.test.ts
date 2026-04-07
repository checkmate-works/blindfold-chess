import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getExpHeatmapData } from './getExpHeatmapData';

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
  };
  return {
    db: mockDb,
    expEvents: {
      userId: 'exp_events.user_id',
      amount: 'exp_events.amount',
      createdAt: 'exp_events.created_at',
    },
  };
});

const mockDb = vi.mocked(db);

describe('getExpHeatmapData', () => {
  const mockGroupBy = vi.fn();
  const mockWhere = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGroupBy.mockResolvedValue([
      { date: '2026-04-01', total: '150' },
      { date: '2026-04-02', total: '75' },
    ]);
    mockWhere.mockReturnValue({ groupBy: mockGroupBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockDb.select.mockReturnValue({ from: mockFrom } as never);
  });

  it('returns a record mapping dates to Exp totals', async () => {
    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({
      '2026-04-01': 150,
      '2026-04-02': 75,
    });
  });

  it('calls db.select with the correct chain', async () => {
    await getExpHeatmapData('user-123');

    expect(mockDb.select).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
  });

  it('returns empty object when no data exists', async () => {
    mockGroupBy.mockResolvedValue([]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({});
  });

  it('handles null total gracefully', async () => {
    mockGroupBy.mockResolvedValue([{ date: '2026-04-01', total: null }]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({ '2026-04-01': 0 });
  });

  it('handles total of string "0" correctly', async () => {
    mockGroupBy.mockResolvedValue([{ date: '2026-04-01', total: '0' }]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({ '2026-04-01': 0 });
  });

  it('handles undefined total gracefully', async () => {
    mockGroupBy.mockResolvedValue([{ date: '2026-04-01', total: undefined }]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({ '2026-04-01': 0 });
  });

  it('handles multiple rows with various totals', async () => {
    mockGroupBy.mockResolvedValue([
      { date: '2026-04-01', total: '100' },
      { date: '2026-04-02', total: '0' },
      { date: '2026-04-03', total: '250' },
      { date: '2026-04-04', total: null },
    ]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({
      '2026-04-01': 100,
      '2026-04-02': 0,
      '2026-04-03': 250,
      '2026-04-04': 0,
    });
  });

  it('propagates database errors', async () => {
    mockGroupBy.mockRejectedValue(new Error('Connection refused'));

    await expect(getExpHeatmapData('user-123')).rejects.toThrow('Connection refused');
  });

  it('handles non-string date by formatting it', async () => {
    // When the DB driver returns a Date object instead of a string
    mockGroupBy.mockResolvedValue([{ date: new Date('2026-04-01T00:00:00Z'), total: '50' }]);

    const result = await getExpHeatmapData('user-123');

    expect(result).toEqual({ '2026-04-01': 50 });
  });
});
