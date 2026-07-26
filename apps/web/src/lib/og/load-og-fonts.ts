/**
 * satori-compatible font loader for the dynamic OG image routes.
 *
 * Game titles are free-form author input that may contain Japanese (or other
 * non-Latin) text, so satori needs real glyphs for whatever characters the
 * card actually renders — not just a Latin webfont.
 *
 * Approach: fetch a `text=`-subsetted Noto Sans JP from the Google Fonts
 * css2 API (only the glyphs actually used are downloaded, keeping this fast)
 * and resolve it to the raw font binary satori consumes.
 *
 * satori/`next/og` cannot parse WOFF2. Google Fonts serves WOFF2 to any
 * modern-looking User-Agent, but falls back to plain WOFF (which satori CAN
 * read) for an old browser UA string — verified against the live API. There
 * is no supported "give me a parseable format" query param, so spoofing the
 * UA is the only lever.
 */

const FONT_FAMILY = 'Noto Sans JP';
const OLD_UA = 'Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1';
const CACHE_LIMIT = 50;

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' };

/** Cache key: the text's unique characters, deduped and order-independent. */
function cacheKeyFor(text: string): string {
  return Array.from(new Set(Array.from(text)))
    .sort()
    .join('');
}

async function fetchOgFonts(text: string): Promise<OgFont[]> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': OLD_UA } });
  if (!cssRes.ok) return [];
  const css = await cssRes.text();

  const fontFaceRe = /@font-face\s*{([^}]*)}/g;
  const sources: { url: string; weight: 400 | 700 }[] = [];
  let match: RegExpExecArray | null;
  while ((match = fontFaceRe.exec(css))) {
    const block = match[1];
    const weightMatch = /font-weight:\s*(400|700)/.exec(block);
    const urlMatch = /url\(([^)]+)\)/.exec(block);
    if (!weightMatch || !urlMatch) continue;
    sources.push({ url: urlMatch[1], weight: Number(weightMatch[1]) as 400 | 700 });
  }
  if (sources.length === 0) return [];

  const loaded = await Promise.all(
    sources.map(async ({ url, weight }) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return { name: FONT_FAMILY, data, weight, style: 'normal' as const };
    })
  );

  return loaded.filter((f): f is OgFont => f !== null);
}

const fontCache = new Map<string, Promise<OgFont[]>>();

/**
 * Resolve satori `fonts` entries covering every character in `text`. Returns
 * `[]` (never throws) on any fetch/parse failure so a transient Google Fonts
 * outage degrades the OG card to a text-less board rather than a 500.
 */
export async function loadOgFonts(text: string): Promise<OgFont[]> {
  if (text.length === 0) return [];

  const key = cacheKeyFor(text);
  const cached = fontCache.get(key);
  if (cached) return cached;

  const promise = fetchOgFonts(text).catch(() => [] as OgFont[]);
  fontCache.set(key, promise);
  if (fontCache.size > CACHE_LIMIT) {
    const oldestKey = fontCache.keys().next().value;
    if (oldestKey !== undefined) fontCache.delete(oldestKey);
  }
  return promise;
}
