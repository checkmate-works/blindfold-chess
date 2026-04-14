import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, getPaginationParams, paginateItems } from './pagination';

describe('paginateItems', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns the first page of items', () => {
    const result = paginateItems(items, 3, 1);
    expect(result).toEqual({
      totalCount: 10,
      totalPages: 4,
      currentPage: 1,
      paginatedItems: [1, 2, 3],
    });
  });

  it('returns a middle page of items', () => {
    const result = paginateItems(items, 3, 2);
    expect(result).toEqual({
      totalCount: 10,
      totalPages: 4,
      currentPage: 2,
      paginatedItems: [4, 5, 6],
    });
  });

  it('returns the last page with remaining items', () => {
    const result = paginateItems(items, 3, 4);
    expect(result).toEqual({
      totalCount: 10,
      totalPages: 4,
      currentPage: 4,
      paginatedItems: [10],
    });
  });

  it('clamps page to 1 when requestedPage is less than 1', () => {
    const result = paginateItems(items, 3, 0);
    expect(result.currentPage).toBe(1);
    expect(result.paginatedItems).toEqual([1, 2, 3]);
  });

  it('clamps page to 1 when requestedPage is negative', () => {
    const result = paginateItems(items, 3, -5);
    expect(result.currentPage).toBe(1);
  });

  it('clamps page to totalPages when requestedPage exceeds total', () => {
    const result = paginateItems(items, 3, 100);
    expect(result.currentPage).toBe(4);
    expect(result.paginatedItems).toEqual([10]);
  });

  it('handles an empty array', () => {
    const result = paginateItems([], 5, 1);
    expect(result).toEqual({
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      paginatedItems: [],
    });
  });

  it('handles pageSize larger than total items', () => {
    const result = paginateItems(items, 20, 1);
    expect(result).toEqual({
      totalCount: 10,
      totalPages: 1,
      currentPage: 1,
      paginatedItems: items,
    });
  });

  it('handles pageSize of 1', () => {
    const result = paginateItems(items, 1, 5);
    expect(result).toEqual({
      totalCount: 10,
      totalPages: 10,
      currentPage: 5,
      paginatedItems: [5],
    });
  });
});

describe('DEFAULT_PAGE_SIZE', () => {
  it('is 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });
});

describe('getPaginationParams', () => {
  it('returns correct params for the first page', () => {
    const result = getPaginationParams(1, 50, 10);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 5,
      limit: 10,
      offset: 0,
    });
  });

  it('returns correct offset for page 3', () => {
    const result = getPaginationParams(3, 50, 10);
    expect(result).toEqual({
      currentPage: 3,
      totalPages: 5,
      limit: 10,
      offset: 20,
    });
  });

  it('clamps requestedPage to 1 when less than 1', () => {
    const result = getPaginationParams(0, 50, 10);
    expect(result.currentPage).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('clamps requestedPage to 1 when negative', () => {
    const result = getPaginationParams(-3, 50, 10);
    expect(result.currentPage).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('returns totalPages of 1 when totalCount is 0', () => {
    const result = getPaginationParams(1, 0, 10);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      offset: 0,
    });
  });

  it('rounds totalPages up for non-even division', () => {
    const result = getPaginationParams(1, 11, 5);
    expect(result.totalPages).toBe(3);
  });

  it('does not clamp requestedPage to totalPages (DB-level pagination)', () => {
    // getPaginationParams does not clamp upper bound — callers handle empty results
    const result = getPaginationParams(100, 50, 10);
    expect(result.currentPage).toBe(100);
    expect(result.offset).toBe(990);
  });

  it('uses DEFAULT_PAGE_SIZE when pageSize is omitted', () => {
    const result = getPaginationParams(1, 50);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 3,
      limit: 20,
      offset: 0,
    });
  });

  it('uses DEFAULT_PAGE_SIZE for offset calculation when pageSize is omitted', () => {
    const result = getPaginationParams(2, 50);
    expect(result).toEqual({
      currentPage: 2,
      totalPages: 3,
      limit: 20,
      offset: 20,
    });
  });
});
