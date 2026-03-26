import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, getPaginationData } from './pagination';

describe('DEFAULT_PAGE_SIZE', () => {
  it('is 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });
});

describe('getPaginationData', () => {
  it('returns correct data for the first page with default page size', () => {
    const result = getPaginationData(1, 50);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 3,
      limit: 20,
      offset: 0,
    });
  });

  it('returns correct offset for page 2', () => {
    const result = getPaginationData(2, 50);
    expect(result).toEqual({
      currentPage: 2,
      totalPages: 3,
      limit: 20,
      offset: 20,
    });
  });

  it('returns correct data with custom page size', () => {
    const result = getPaginationData(3, 50, 10);
    expect(result).toEqual({
      currentPage: 3,
      totalPages: 5,
      limit: 10,
      offset: 20,
    });
  });

  it('clamps page to 1 when page is 0', () => {
    const result = getPaginationData(0, 50);
    expect(result.currentPage).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('clamps page to 1 when page is negative', () => {
    const result = getPaginationData(-5, 50);
    expect(result.currentPage).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('returns totalPages of 1 when totalCount is 0', () => {
    const result = getPaginationData(1, 0);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('rounds totalPages up for non-even division', () => {
    const result = getPaginationData(1, 21);
    expect(result.totalPages).toBe(2);
  });

  it('handles totalCount exactly divisible by pageSize', () => {
    const result = getPaginationData(1, 40);
    expect(result.totalPages).toBe(2);
  });

  it('handles totalCount of 1', () => {
    const result = getPaginationData(1, 1);
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('handles page beyond totalPages (returns high offset)', () => {
    const result = getPaginationData(100, 50);
    expect(result.currentPage).toBe(100);
    expect(result.offset).toBe(1980);
  });

  it('uses custom pageSize for limit', () => {
    const result = getPaginationData(1, 100, 5);
    expect(result.limit).toBe(5);
    expect(result.totalPages).toBe(20);
  });
});
