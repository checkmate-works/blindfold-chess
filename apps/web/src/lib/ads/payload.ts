import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AdKind } from './registry';

/**
 * Product default for ad-image alt text. Server validation permits an empty
 * alt, so this form-prefill value is the de-facto default on every creative
 * whose alt the admin never touches.
 */
export const DEFAULT_AD_ALT = 'Advertisement';

/**
 * The native card's thumbnail. A board `fen` is always present (the fallback);
 * an optional uploaded `imagePath` (e.g. a book cover) overrides the board when
 * set. So a creative can carry both, and the image simply wins at render time —
 * removing the image reveals the board again.
 */
export type NativeCardThumbnail = {
  fen: string;
  imagePath?: string | null;
  imageAlt?: string;
};

/**
 * Default board shown when a native card has no `thumbnail` set — Ruy Lopez
 * after 3. Bb5, a recognizable, on-topic opening. Keeps pre-`thumbnail`
 * creatives rendering unchanged.
 */
export const DEFAULT_NATIVE_THUMBNAIL_FEN =
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

/**
 * Copy for one card field, written once per locale. `en` is required and is
 * the fallback for every locale left blank, so a card always has something to
 * render no matter which language the visitor is reading in.
 *
 * Copy used to be a single string. That worked because a creative was
 * country-targeted (`target_country`) and was therefore written in that one
 * country's language. The targeting itself only ever existed to point a
 * creative at the right Amazon storefront (amazon.com vs amazon.fr), so it
 * went away with Amazon — and the locale, already a route parameter, is a
 * better lever for the language than a geo lookup ever was: a Japanese
 * speaker browsing from Germany gets Japanese copy, which country targeting
 * could not express. Per-locale copy is what replaced it, not an
 * afterthought.
 */
export type LocalizedCopy = Partial<Record<Locale, string>> & { en: string };

/**
 * In-feed native card — renders inside the timeline with the same shell as a
 * real feed item. `avatarImagePath` is nullable: when absent the card falls
 * back to a text placeholder (see `NativeAdCard`). `title`/`description` are
 * per-locale maps, resolved for the viewer by `resolveNativeCopy`; rows
 * written before the split still hold a bare string and are read as `en`, so
 * no JSONB data migration is needed. `thumbnail` is optional for backward
 * compatibility — absent means the default board (see
 * `DEFAULT_NATIVE_THUMBNAIL_FEN` / `resolveNativeThumbnail`).
 */
export type NativeCardPayload = {
  avatarImagePath: string | null;
  avatarAlt: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  thumbnail?: NativeCardThumbnail;
};

/**
 * Practice-grid native tile — the shape a `/practice` module tile has:
 * an emoji before the title, a line of copy, and the creative's thumbnail
 * where a module's example band sits. No author row, because the tiles it
 * stands among have no author; the disclosure badge takes the corner the
 * rank badge occupies on a module tile.
 *
 * `icon` is the one field a card does not have and the one that makes the
 * tile read as a tile. It is required: an empty corner is how a module tile
 * says "no rank", and a title with no emoji is how nothing else on that grid
 * looks.
 */
export type NativeTilePayload = {
  icon: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  thumbnail?: NativeCardThumbnail;
};

/** Structural shape of the copy both kinds carry, for {@link resolveNativeCopy}. */
export type LocalizedCopyPair = { title: LocalizedCopy; description: LocalizedCopy };

/**
 * One field's copy for `locale`: the locale's own string when the admin wrote
 * one, `en` otherwise. A bare string — the pre-split shape, still in the DB —
 * counts as `en`. Returns `''` for a payload whose copy is neither, which the
 * guard already rejects; the render sites treat empty copy as a blank line
 * rather than throwing.
 */
function copyForLocale(value: unknown, locale: Locale): string {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return '';
  const map = value as Record<string, unknown>;
  const localized = map[locale];
  if (typeof localized === 'string' && localized.length > 0) return localized;
  return typeof map.en === 'string' ? map.en : '';
}

/**
 * The card's copy as the viewer should read it. Mirrors
 * {@link resolveNativeThumbnail}: normalize at read time so both the current
 * per-locale shape and the legacy single string render, and the JSONB column
 * never needs rewriting.
 */
export function resolveNativeCopy(
  payload: LocalizedCopyPair,
  locale: Locale
): { title: string; description: string } {
  return {
    title: copyForLocale(payload.title, locale),
    description: copyForLocale(payload.description, locale),
  };
}

/**
 * The stored copy spread over every supported locale, for the admin form.
 * A legacy bare string lands in `en`; a locale the admin never wrote comes
 * back empty rather than pre-filled with the English fallback, which would
 * silently freeze today's English into every language on the next save.
 */
export function toLocalizedCopyDraft(value: unknown): Record<Locale, string> {
  const draft = Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, ''])) as Record<Locale, string>;
  if (typeof value === 'string') {
    draft.en = value;
    return draft;
  }
  if (typeof value === 'object' && value !== null) {
    for (const locale of SUPPORTED_LOCALES) {
      const localized = (value as Record<string, unknown>)[locale];
      if (typeof localized === 'string') draft[locale] = localized;
    }
  }
  return draft;
}

/**
 * A form draft as the shape that gets stored: blank locales are dropped
 * rather than saved as empty strings, so they keep falling back to `en`
 * instead of rendering a blank card.
 */
export function fromLocalizedCopyDraft(draft: Record<Locale, string>): LocalizedCopy {
  const stored: Partial<Record<Locale, string>> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const value = draft[locale].trim();
    if (value.length > 0) stored[locale] = value;
  }
  return { ...stored, en: draft.en.trim() };
}

/**
 * The effective thumbnail, normalized to the current shape. Handles unset
 * thumbnails and legacy discriminated-union payloads (`{type:'board'|'image'}`)
 * still in the DB, so a schema-free JSONB migration is unnecessary: an old
 * image thumbnail becomes an override image over the default board.
 */
export function resolveNativeThumbnail(payload: AdPayload): NativeCardThumbnail {
  const t = payload.thumbnail as Record<string, unknown> | null | undefined;
  if (!t) return { fen: DEFAULT_NATIVE_THUMBNAIL_FEN };

  // Current shape: a board `fen`, with an optional override image.
  if (typeof t.fen === 'string') {
    if (typeof t.imagePath === 'string' && t.imagePath.length > 0) {
      return {
        fen: t.fen,
        imagePath: t.imagePath,
        imageAlt: typeof t.imageAlt === 'string' ? t.imageAlt : '',
      };
    }
    return { fen: t.fen };
  }

  // Legacy `{ type: 'image', imagePath, alt }` → override image over the default.
  if (t.type === 'image' && typeof t.imagePath === 'string') {
    return {
      fen: DEFAULT_NATIVE_THUMBNAIL_FEN,
      imagePath: t.imagePath,
      imageAlt: typeof t.alt === 'string' ? t.alt : '',
    };
  }

  // Legacy `{ type: 'board' }` or anything unrecognized → the default board.
  return { fen: DEFAULT_NATIVE_THUMBNAIL_FEN };
}

export type AdPayloadByKind = {
  native_card: NativeCardPayload;
  native_tile: NativeTilePayload;
};

/** Any kind's payload — what a validator or an admin form holds before it
 * knows (or after it has forgotten) which kind the slot binds. */
export type AdPayload = AdPayloadByKind[AdKind];

/**
 * Both copy shapes pass: the per-locale map (which must carry `en`, the
 * fallback every other locale leans on) and the bare string rows written
 * before the split, which `resolveNativeCopy` reads as `en`.
 */
function isLocalizedCopy(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as Record<string, unknown>).en === 'string';
}

export function isNativeCardPayload(value: unknown): value is NativeCardPayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  // The thumbnail's shape is intentionally NOT validated here: it is optional
  // and best-effort normalized at read time (see `resolveNativeThumbnail`,
  // which also accepts legacy shapes), so a malformed/old thumbnail must not
  // disqualify an otherwise-valid native creative.
  return (
    (p.avatarImagePath === null || typeof p.avatarImagePath === 'string') &&
    typeof p.avatarAlt === 'string' &&
    isLocalizedCopy(p.title) &&
    isLocalizedCopy(p.description)
  );
}

/**
 * The tile's thumbnail is unvalidated here for the same reason the card's is
 * — it is optional and normalized at read time — and `icon` is checked for
 * presence only. Which emoji it is is an editorial judgement the admin makes,
 * not something a guard can hold an opinion about.
 */
export function isNativeTilePayload(value: unknown): value is NativeTilePayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.icon === 'string' &&
    p.icon.length > 0 &&
    isLocalizedCopy(p.title) &&
    isLocalizedCopy(p.description)
  );
}

const PAYLOAD_GUARDS: { [K in AdKind]: (value: unknown) => value is AdPayloadByKind[K] } = {
  native_card: isNativeCardPayload,
  native_tile: isNativeTilePayload,
};

/** Type-guard a raw JSONB payload against the guard for the given kind. */
export function isPayloadForKind<K extends AdKind>(
  kind: K,
  value: unknown
): value is AdPayloadByKind[K] {
  return PAYLOAD_GUARDS[kind](value);
}

/**
 * The title and thumbnail the admin list shows for a creative of any kind,
 * or `null` when the stored payload does not match the kind its slot binds
 * (a row written before a guard tightened, say).
 *
 * Both kinds carry per-locale copy and an optional thumbnail, so this is the
 * whole of what the list needs and the one place that has to know a third
 * kind exists too.
 */
export function resolveAdSummary(
  kind: AdKind,
  payload: unknown,
  locale: Locale
): { title: string; thumbnail: NativeCardThumbnail } | null {
  if (!isPayloadForKind(kind, payload)) return null;
  return {
    title: resolveNativeCopy(payload, locale).title,
    thumbnail: resolveNativeThumbnail(payload),
  };
}
