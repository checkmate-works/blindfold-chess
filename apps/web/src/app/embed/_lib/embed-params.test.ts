import { describe, expect, it } from 'vitest';

import { parseEmbedParams } from './embed-params';

describe('parseEmbedParams', () => {
  it('defaults to the as-played view with everything else left to the caller', () => {
    expect(parseEmbedParams({})).toEqual({
      view: 'played',
      orientation: undefined,
      theme: undefined,
      ply: undefined,
      lang: undefined,
    });
  });

  it('accepts the documented values', () => {
    expect(
      parseEmbedParams({ view: 'plain', color: 'black', theme: 'chesscom', ply: '12', lang: 'ja' })
    ).toEqual({
      view: 'plain',
      orientation: 'black',
      theme: 'chesscom',
      ply: 12,
      lang: 'ja',
    });
  });

  it('opens at the starting position for ply=0 rather than treating it as absent', () => {
    expect(parseEmbedParams({ ply: '0' }).ply).toBe(0);
  });

  it('falls back to defaults for junk instead of failing the page', () => {
    const params = parseEmbedParams({
      view: 'PLAYED',
      color: 'sideways',
      theme: 'neon',
      ply: '-3',
      lang: 'fr',
    });
    expect(params).toEqual({
      view: 'played',
      orientation: undefined,
      theme: undefined,
      ply: undefined,
      lang: undefined,
    });
  });

  it.each(['', 'abc', '3.5', '1e3', ' '])('ignores the unusable ply %o', (ply) => {
    expect(parseEmbedParams({ ply }).ply).toBeUndefined();
  });

  it('takes the first value of a repeated key', () => {
    expect(parseEmbedParams({ view: ['plain', 'played'] }).view).toBe('plain');
    expect(parseEmbedParams({ color: ['black', 'white'] }).orientation).toBe('black');
  });

  it('matches locales case-sensitively so a hand-written pt-br falls back rather than 404ing later', () => {
    expect(parseEmbedParams({ lang: 'pt-BR' }).lang).toBe('pt-BR');
    expect(parseEmbedParams({ lang: 'pt-br' }).lang).toBeUndefined();
  });
});
