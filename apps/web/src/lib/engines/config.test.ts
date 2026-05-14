import { describe, expect, it } from 'vitest';

import type { SkillLevel } from '@/lib/types';

import {
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  engineConfigFromUrlParams,
  engineConfigToUrlParams,
  isEngineConfig,
} from './config';

describe('engineConfigToUrlParams', () => {
  it('emits skillLevel only for Stockfish (no engine= for backward-compat share links)', () => {
    const params = engineConfigToUrlParams({ kind: 'stockfish', skillLevel: 7 as SkillLevel });
    expect(params).toEqual({ skillLevel: '7' });
  });

  it('emits engine=maia + elo for Maia', () => {
    const params = engineConfigToUrlParams({ kind: 'maia', rating: 1600 });
    expect(params).toEqual({ engine: 'maia', elo: '1600' });
  });
});

describe('engineConfigFromUrlParams', () => {
  it('parses Stockfish skillLevel from ?skillLevel=N', () => {
    const params = new URLSearchParams({ skillLevel: '12' });
    expect(engineConfigFromUrlParams(params)).toEqual({ kind: 'stockfish', skillLevel: 12 });
  });

  it('parses Maia rating from ?engine=maia&elo=N (when in the official catalog)', () => {
    const params = new URLSearchParams({ engine: 'maia', elo: '1800' });
    expect(engineConfigFromUrlParams(params)).toEqual({ kind: 'maia', rating: 1800 });
  });

  it('falls back to default Maia rating when elo is missing', () => {
    const params = new URLSearchParams({ engine: 'maia' });
    expect(engineConfigFromUrlParams(params)).toEqual({ kind: 'maia', rating: 1600 });
  });

  it('falls back to default Maia rating when elo is off-catalog', () => {
    const params = new URLSearchParams({ engine: 'maia', elo: '1234' });
    expect(engineConfigFromUrlParams(params)).toEqual({ kind: 'maia', rating: 1600 });
  });

  it('falls back to default Stockfish config when skillLevel is missing', () => {
    const params = new URLSearchParams();
    expect(engineConfigFromUrlParams(params)).toEqual(DEFAULT_ENGINE_CONFIG);
  });

  it('falls back to default Stockfish config when skillLevel is out of range', () => {
    const params = new URLSearchParams({ skillLevel: '99' });
    expect(engineConfigFromUrlParams(params)).toEqual(DEFAULT_ENGINE_CONFIG);
  });

  it('treats unknown engine values as Stockfish', () => {
    const params = new URLSearchParams({ engine: 'lc0', skillLevel: '3' });
    expect(engineConfigFromUrlParams(params)).toEqual({ kind: 'stockfish', skillLevel: 3 });
  });
});

describe('round-trip', () => {
  const cases: EngineConfig[] = [
    { kind: 'stockfish', skillLevel: 1 as SkillLevel },
    { kind: 'stockfish', skillLevel: 20 as SkillLevel },
    { kind: 'maia', rating: 600 },
    { kind: 'maia', rating: 1600 },
    { kind: 'maia', rating: 2600 },
  ];

  it.each(cases)('serialises and parses back to the same config: %j', (config) => {
    const params = new URLSearchParams(engineConfigToUrlParams(config));
    expect(engineConfigFromUrlParams(params)).toEqual(config);
  });
});

describe('isEngineConfig', () => {
  it('accepts a well-formed Stockfish config', () => {
    expect(isEngineConfig({ kind: 'stockfish', skillLevel: 5 })).toBe(true);
  });

  it('accepts a well-formed Maia config', () => {
    expect(isEngineConfig({ kind: 'maia', rating: 1600 })).toBe(true);
  });

  it('rejects Stockfish with an out-of-range skillLevel', () => {
    expect(isEngineConfig({ kind: 'stockfish', skillLevel: 99 })).toBe(false);
  });

  it('rejects Maia with an off-catalog rating', () => {
    expect(isEngineConfig({ kind: 'maia', rating: 1234 })).toBe(false);
  });

  it('rejects unknown discriminators', () => {
    expect(isEngineConfig({ kind: 'lc0', someValue: 1 })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isEngineConfig(null)).toBe(false);
    expect(isEngineConfig(undefined)).toBe(false);
    expect(isEngineConfig('stockfish')).toBe(false);
    expect(isEngineConfig(5)).toBe(false);
  });
});
