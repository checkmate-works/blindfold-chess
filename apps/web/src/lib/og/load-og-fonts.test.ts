import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CSS_WITH_BOTH_WEIGHTS = `
@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/notosansjp/w400.woff) format('woff');
}
@font-face {
  font-family: 'Noto Sans JP';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/notosansjp/w700.woff) format('woff');
}
`;

const okCss = () => ({ ok: true, text: async () => CSS_WITH_BOTH_WEIGHTS });
const okFont = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const respondByUrl = (url: string) => (String(url).includes('/css2?') ? okCss() : okFont());

/**
 * The module holds its cache at module scope, so every test imports a fresh
 * copy to start from an empty cache.
 */
async function importFresh() {
  vi.resetModules();
  return import('./load-og-fonts');
}

describe('loadOgFonts', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves one satori font entry per weight from the css2 response', async () => {
    fetchMock.mockImplementation(respondByUrl);
    const { loadOgFonts } = await importFresh();

    const fonts = await loadOgFonts('棋譜');

    expect(fonts.map((f) => f.weight).sort()).toEqual([400, 700]);
    expect(fonts.every((f) => f.name === 'Noto Sans JP' && f.style === 'normal')).toBe(true);
  });

  it('returns [] without fetching for empty text', async () => {
    const { loadOgFonts } = await importFresh();
    expect(await loadOgFonts('')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches a successful result per character set, order-independently', async () => {
    fetchMock.mockImplementation(respondByUrl);
    const { loadOgFonts } = await importFresh();

    await loadOgFonts('ab');
    await loadOgFonts('ba'); // same character set → same cache key
    await loadOgFonts('aabb');

    // 1 css2 request + 2 font binaries, once.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares one in-flight fetch between concurrent calls for the same key', async () => {
    fetchMock.mockImplementation(respondByUrl);
    const { loadOgFonts } = await importFresh();

    const [a, b] = await Promise.all([loadOgFonts('a'), loadOgFonts('a')]);

    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/css2?'))).toHaveLength(1);
  });

  it('retries after a non-ok css2 response instead of caching the empty result', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const { loadOgFonts } = await importFresh();

    expect(await loadOgFonts('a')).toEqual([]);

    fetchMock.mockImplementation(respondByUrl);
    expect(await loadOgFonts('a')).toHaveLength(2);
  });

  it('retries after a rejected fetch instead of caching the failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const { loadOgFonts } = await importFresh();

    expect(await loadOgFonts('a')).toEqual([]);

    fetchMock.mockImplementation(respondByUrl);
    expect(await loadOgFonts('a')).toHaveLength(2);
  });

  it('retries when the font binary download fails (empty result path)', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/css2?') ? okCss() : { ok: false }
    );
    const { loadOgFonts } = await importFresh();

    expect(await loadOgFonts('a')).toEqual([]);

    fetchMock.mockImplementation(respondByUrl);
    expect(await loadOgFonts('a')).toHaveLength(2);
  });
});
