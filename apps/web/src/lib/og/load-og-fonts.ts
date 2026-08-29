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
import { createFetchWithTimeout } from '@/lib/http/fetch-with-timeout';

const FONT_FAMILY = 'Noto Sans JP';
const OLD_UA = 'Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1';
const CACHE_LIMIT = 50;

/**
 * Deadline for each Google Fonts request (the css2 lookup, then each font
 * binary).
 *
 * Deliberately short, because the failure here is cheap: no fonts means a
 * board-only card, which is what {@link loadOgFonts} already returns for an
 * outage. Nobody is served by waiting longer than the social crawler that
 * asked for the image is willing to wait — and the payload is a `text=`
 * subset of a few glyphs, so a healthy round trip is far inside this.
 *
 * Without a deadline the degrade path was unreachable for the failure that
 * matters most: a hang is not a rejection, so `fetchOgFonts` simply never
 * settled and neither did the OG route.
 */
const OG_FONT_FETCH_TIMEOUT_MS = 3_000;

const fetchWithTimeout = createFetchWithTimeout(OG_FONT_FETCH_TIMEOUT_MS);

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' };

/** Cache key: the text's unique characters, deduped and order-independent. */
function cacheKeyFor(text: string): string {
  return Array.from(new Set(Array.from(text)))
    .sort()
    .join('');
}

async function fetchOgFonts(text: string): Promise<OgFont[]> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&text=${encodeURIComponent(text)}`;
  const cssRes = await fetchWithTimeout(cssUrl, { headers: { 'User-Agent': OLD_UA } });
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
      const res = await fetchWithTimeout(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return { name: FONT_FAMILY, data, weight, style: 'normal' as const };
    })
  );

  return loaded.filter((f): f is OgFont => f !== null);
}

/**
 * Success-only cache of resolved font sets, keyed by character set.
 *
 * The in-flight promise is stored (not the resolved value) so concurrent
 * requests for the same character set share one Google Fonts round-trip —
 * but only a *successful, non-empty* result may stay cached. A failed or
 * empty resolution evicts its own entry so the next request retries:
 * caching it would turn one transient 429/5xx into every subsequent OG
 * card for that character set rendering with no glyphs for the lifetime
 * of the serverless instance.
 *
 * Eviction only works because every fetch has a deadline. A hung request
 * settles neither way, so before {@link OG_FONT_FETCH_TIMEOUT_MS} it left a
 * promise in this map that no handler below could ever remove — and every
 * later render of that character set awaited the same one.
 *
 * Reads refresh recency (delete + re-set), making eviction LRU rather
 * than insertion-order FIFO — otherwise the hottest keys are the first
 * to be evicted.
 */
const fontCache = new Map<string, Promise<OgFont[]>>();

/**
 * Resolve satori `fonts` entries covering every character in `text`. Returns
 * `[]` (never throws) on any fetch/parse failure — including a request that
 * outlives {@link OG_FONT_FETCH_TIMEOUT_MS} — so a transient Google Fonts
 * outage degrades the OG card to a text-less board rather than a 500 or a
 * render that never finishes.
 */
export async function loadOgFonts(text: string): Promise<OgFont[]> {
  if (text.length === 0) return [];

  const key = cacheKeyFor(text);
  const cached = fontCache.get(key);
  if (cached) {
    fontCache.delete(key);
    fontCache.set(key, cached);
    return cached;
  }

  // The guard against `fontCache.get(key) !== promise` protects a newer
  // in-flight promise for the same key (possible once this entry has been
  // evicted and the key re-requested) from being evicted by this one.
  const promise = fetchOgFonts(text).then(
    (fonts) => {
      if (fonts.length === 0 && fontCache.get(key) === promise) fontCache.delete(key);
      return fonts;
    },
    () => {
      if (fontCache.get(key) === promise) fontCache.delete(key);
      return [] as OgFont[];
    }
  );
  fontCache.set(key, promise);
  if (fontCache.size > CACHE_LIMIT) {
    const oldestKey = fontCache.keys().next().value;
    if (oldestKey !== undefined) fontCache.delete(oldestKey);
  }
  return promise;
}
