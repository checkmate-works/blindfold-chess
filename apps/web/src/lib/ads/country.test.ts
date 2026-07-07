import { describe, expect, it } from 'vitest';

import { creativeAllowedInCountry, filterByCountry, getRequestCountry } from './country';

describe('getRequestCountry', () => {
  const h = (v?: string) => new Headers(v ? { 'x-vercel-ip-country': v } : {});

  it('returns the uppercase 2-letter code', () => {
    expect(getRequestCountry(h('jp'))).toBe('JP');
    expect(getRequestCountry(h('US'))).toBe('US');
  });

  it('returns null when the header is absent', () => {
    expect(getRequestCountry(h())).toBeNull();
  });

  it('returns null for malformed values', () => {
    expect(getRequestCountry(h('XYZ'))).toBeNull();
    expect(getRequestCountry(h('1'))).toBeNull();
    expect(getRequestCountry(h(''))).toBeNull();
  });
});

describe('creativeAllowedInCountry', () => {
  it('global creative (null target) shows everywhere, even unknown geo', () => {
    expect(creativeAllowedInCountry(null, 'JP')).toBe(true);
    expect(creativeAllowedInCountry(null, 'US')).toBe(true);
    expect(creativeAllowedInCountry(null, null)).toBe(true);
  });

  it('targeted creative shows only in its country', () => {
    expect(creativeAllowedInCountry('JP', 'JP')).toBe(true);
    expect(creativeAllowedInCountry('JP', 'US')).toBe(false);
  });

  it('targeted creative is withheld when the country is unknown (fail closed)', () => {
    expect(creativeAllowedInCountry('JP', null)).toBe(false);
  });
});

describe('filterByCountry', () => {
  const make = (id: string, targetCountry: string | null) => ({ id, targetCountry });

  it('keeps global creatives and country-matched ones, drops the rest', () => {
    const pool = [make('global', null), make('jp', 'JP'), make('us', 'US')];
    expect(filterByCountry(pool, 'JP').map((c) => c.id)).toEqual(['global', 'jp']);
    expect(filterByCountry(pool, 'US').map((c) => c.id)).toEqual(['global', 'us']);
  });

  it('unknown geo keeps only global creatives', () => {
    const pool = [make('global', null), make('jp', 'JP')];
    expect(filterByCountry(pool, null).map((c) => c.id)).toEqual(['global']);
  });
});
