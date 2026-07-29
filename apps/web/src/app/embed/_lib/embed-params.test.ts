import { describe, expect, it } from 'vitest';

import { parseEmbedParams, parseEmbedParamsFromSearch } from './embed-params';

describe('parseEmbedParams', () => {
  it('defaults to the as-played view with everything else left to the caller', () => {
    expect(parseEmbedParams({})).toEqual({
      view: 'played',
      orientation: undefined,
      theme: undefined,
      ply: undefined,
      lang: undefined,
      bg: undefined,
    });
  });

  it('accepts the documented values', () => {
    expect(
      parseEmbedParams({
        view: 'plain',
        color: 'black',
        theme: 'chesscom',
        ply: '12',
        lang: 'ja',
        bg: 'dark',
      })
    ).toEqual({
      view: 'plain',
      orientation: 'black',
      theme: 'chesscom',
      ply: 12,
      lang: 'ja',
      bg: 'dark',
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
      bg: 'sepia',
    });
    expect(params).toEqual({
      view: 'played',
      orientation: undefined,
      theme: undefined,
      ply: undefined,
      lang: undefined,
      bg: undefined,
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

describe('parseEmbedParamsFromSearch', () => {
  it('reads the same values out of a raw query string', () => {
    expect(parseEmbedParamsFromSearch('?view=plain&bg=dark&lang=ja&ply=4')).toEqual({
      view: 'plain',
      orientation: undefined,
      theme: undefined,
      ply: 4,
      lang: 'ja',
      bg: 'dark',
    });
  });

  it('handles the empty query a request without params carries', () => {
    expect(parseEmbedParamsFromSearch('')).toEqual(parseEmbedParams({}));
  });

  // The layout parses the raw query and the page parses `searchParams`. If the
  // two disagreed on a repeated key, `?lang=ja&lang=en` would give the document
  // one `<html lang>` and the widget inside it the other language's strings.
  it('takes the first value of a repeated key, as the object parse does', () => {
    expect(parseEmbedParamsFromSearch('?lang=ja&lang=en').lang).toBe('ja');
    expect(parseEmbedParamsFromSearch('?bg=dark&bg=light').bg).toBe('dark');
  });

  it.each([
    '?lang=ja&lang=en&bg=dark&bg=light&view=plain&view=played',
    '?view=plain&view=played&lang=ja&lang=en&bg=dark&bg=light',
  ])('agrees with the object parse over %o', (search) => {
    const fromSearch = parseEmbedParamsFromSearch(search);
    const fromObject = parseEmbedParams({
      lang: ['ja', 'en'],
      bg: ['dark', 'light'],
      view: ['plain', 'played'],
    });
    expect(fromSearch).toEqual(fromObject);
  });
});
