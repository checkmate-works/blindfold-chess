import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  buildPageHref,
  clampPage,
  getPaginationParams,
  paginateItems,
  resolvePagination,
} from './pagination';

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

describe('clampPage', () => {
  it('returns the requested page when it is in range', () => {
    expect(clampPage(3, 5)).toBe(3);
  });

  it('clamps to 1 when the requested page is below range', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-7, 5)).toBe(1);
  });

  it('clamps to totalPages when the requested page is above range', () => {
    expect(clampPage(999, 3)).toBe(3);
  });

  it('collapses an empty list (0 pages) to page 1', () => {
    expect(clampPage(1, 0)).toBe(1);
    expect(clampPage(42, 0)).toBe(1);
  });
});

describe('resolvePagination', () => {
  it('returns the requested page and its offset', () => {
    expect(resolvePagination(3, 50, 10)).toEqual({
      currentPage: 3,
      totalPages: 5,
      offset: 20,
    });
  });

  it('rounds totalPages up for non-even division', () => {
    expect(resolvePagination(1, 11, 5).totalPages).toBe(3);
  });

  it('clamps an over-range page down to the last page', () => {
    expect(resolvePagination(100, 50, 10)).toEqual({
      currentPage: 5,
      totalPages: 5,
      offset: 40,
    });
  });

  it('clamps an under-range page up to the first page', () => {
    expect(resolvePagination(0, 50, 10)).toEqual({
      currentPage: 1,
      totalPages: 5,
      offset: 0,
    });
  });

  it('reports 0 totalPages for an empty list but still lands on page 1', () => {
    expect(resolvePagination(1, 0, 10)).toEqual({
      currentPage: 1,
      totalPages: 0,
      offset: 0,
    });
  });
});

describe('buildPageHref', () => {
  it('spells page 1 as the bare path', () => {
    expect(buildPageHref('/ja/articles')(1)).toBe('/ja/articles');
  });

  it('appends the page number from page 2 on', () => {
    expect(buildPageHref('/ja/articles')(2)).toBe('/ja/articles?page=2');
  });

  it('keeps applied filters on every page, including the first', () => {
    const href = buildPageHref('/ja/mypage/challenges/results', {
      menu: 'legal_moves',
      key: 'blitz',
    });

    expect(href(1)).toBe('/ja/mypage/challenges/results?menu=legal_moves&key=blitz');
    expect(href(3)).toBe('/ja/mypage/challenges/results?page=3&menu=legal_moves&key=blitz');
  });

  it('omits empty and absent filters', () => {
    expect(buildPageHref('/ja/list', { menu: null, key: '', tag: undefined })(1)).toBe('/ja/list');
  });
});
