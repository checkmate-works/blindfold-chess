import { describe, expect, it } from 'vitest';

import type { SkillLevel } from '@/lib/games/saved-game-types';

import {
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  engineConfigFromUrlParams,
  engineConfigToUrlParams,
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
