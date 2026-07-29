import { parseEmbedParams } from '@/app/embed/_lib/embed-params';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EMBED_OPTIONS,
  type EmbedOptions,
  buildEmbedSnippet,
  buildEmbedUrl,
} from './embed-snippet';
import { decodeGameShortId } from './short-id';

const SITE = 'https://example.test';
const ID = '019f8e93-32ad-750e-894e-267acf1575e2';

/** The `?...` of a built URL, as the embed page would receive it. */
function queryOf(url: string): string {
  return new URL(url).search;
}

describe('buildEmbedUrl', () => {
  it('addresses the game by its share code, so an embed URL and a share link carry the same id', () => {
    const url = buildEmbedUrl(SITE, ID, DEFAULT_EMBED_OPTIONS);
    const code = url.slice(`${SITE}/embed/g/`.length);
    expect(decodeGameShortId(code)).toBe(ID);
  });

  it('emits no query at all for the defaults', () => {
    expect(buildEmbedUrl(SITE, ID, DEFAULT_EMBED_OPTIONS)).toBe(
      `${SITE}/embed/g/AZ-OkzKtdQ6JTiZ6zxV14g`
    );
  });

  it('emits only the choices that differ from the default', () => {
    const options: EmbedOptions = {
      ...DEFAULT_EMBED_OPTIONS,
      bg: 'dark',
      orientation: 'black',
    };
    expect(queryOf(buildEmbedUrl(SITE, ID, options))).toBe('?color=black&bg=dark');
  });

  it('round-trips every option through the page that has to read it', () => {
    const options: EmbedOptions = {
      view: 'plain',
      orientation: 'white',
      bg: 'light',
      lang: 'ja',
      theme: 'chesscom',
      ply: 12,
    };
    const search = queryOf(buildEmbedUrl(SITE, ID, options));
    const parsed = parseEmbedParams(Object.fromEntries(new URLSearchParams(search)));

    expect(parsed).toEqual({
      view: 'plain',
      orientation: 'white',
      bg: 'light',
      lang: 'ja',
      theme: 'chesscom',
      ply: 12,
    });
  });

  it('keeps ply=0 — "open on the starting position" is a real choice', () => {
    expect(queryOf(buildEmbedUrl(SITE, ID, { ...DEFAULT_EMBED_OPTIONS, ply: 0 }))).toBe('?ply=0');
  });
});

describe('buildEmbedSnippet', () => {
  const snippet = (title: string) =>
    buildEmbedSnippet({ siteUrl: SITE, gameId: ID, title, options: DEFAULT_EMBED_OPTIONS });

  it('is a responsive iframe with an accessible name', () => {
    expect(snippet('My blindfold win')).toBe(
      '<iframe src="https://example.test/embed/g/AZ-OkzKtdQ6JTiZ6zxV14g" title="My blindfold win"' +
        ' width="100%" height="560"' +
        ' style="border:0;width:100%;max-width:480px;aspect-ratio:480 / 623;height:auto"' +
        ' loading="lazy"></iframe>'
    );
  });

  it('does not let a game title break out of the attribute it lands in', () => {
    // The title is user input, and the snippet is markup someone else pastes
    // into their own site.
    const out = snippet('"><script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
  });

  it('escapes ampersands in the URL before they reach the attribute', () => {
    const out = buildEmbedSnippet({
      siteUrl: SITE,
      gameId: ID,
      title: 'x',
      options: { ...DEFAULT_EMBED_OPTIONS, bg: 'dark', lang: 'ja' },
    });
    expect(out).toContain('?bg=dark&amp;lang=ja');
    expect(out).not.toContain('?bg=dark&lang=ja');
  });

  it('takes a caller-chosen height', () => {
    expect(
      buildEmbedSnippet({
        siteUrl: SITE,
        gameId: ID,
        title: 'x',
        options: DEFAULT_EMBED_OPTIONS,
        height: 720,
      })
    ).toContain('height="720"');
  });
});
