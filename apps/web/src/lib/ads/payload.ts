import type { AdKind } from './registry';

/** Rectangle image banner (the generic, non-feed placements). */
export type BannerPayload = {
  imagePath: string;
  alt: string;
  width: number;
  height: number;
};

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
 * In-feed native card — renders inside the timeline with the same shell as a
 * real feed item. `avatarImagePath` is nullable: when absent the card falls
 * back to a text placeholder (see `NativeAdCard`). `title`/`description` are
 * single strings, not per-locale maps: a creative is country-targeted
 * (`target_country`), so its copy is written in that country's language (or
 * English for a global creative). `thumbnail` is optional for backward
 * compatibility — absent means the default board (see
 * `DEFAULT_NATIVE_THUMBNAIL_FEN` / `resolveNativeThumbnail`).
 */
export type NativeCardPayload = {
  avatarImagePath: string | null;
  avatarAlt: string;
  title: string;
  description: string;
  thumbnail?: NativeCardThumbnail;
};

export function isNativeCardThumbnail(value: unknown): value is NativeCardThumbnail {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  if (typeof t.fen !== 'string') return false;
  if (t.imagePath !== undefined && t.imagePath !== null && typeof t.imagePath !== 'string') {
    return false;
  }
  if (t.imageAlt !== undefined && typeof t.imageAlt !== 'string') return false;
  return true;
}

/**
 * The effective thumbnail, normalized to the current shape. Handles unset
 * thumbnails and legacy discriminated-union payloads (`{type:'board'|'image'}`)
 * still in the DB, so a schema-free JSONB migration is unnecessary: an old
 * image thumbnail becomes an override image over the default board.
 */
export function resolveNativeThumbnail(payload: NativeCardPayload): NativeCardThumbnail {
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

/** Whether the thumbnail's override image is set (image wins over the board). */
export function thumbnailHasImage(thumbnail: NativeCardThumbnail): boolean {
  return typeof thumbnail.imagePath === 'string' && thumbnail.imagePath.length > 0;
}

export type AdPayloadByKind = {
  banner: BannerPayload;
  native_card: NativeCardPayload;
};

export function isBannerPayload(value: unknown): value is BannerPayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.imagePath === 'string' &&
    typeof p.alt === 'string' &&
    typeof p.width === 'number' &&
    typeof p.height === 'number'
  );
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
    typeof p.title === 'string' &&
    typeof p.description === 'string'
  );
}

const PAYLOAD_GUARDS: { [K in AdKind]: (value: unknown) => value is AdPayloadByKind[K] } = {
  banner: isBannerPayload,
  native_card: isNativeCardPayload,
};

/** Type-guard a raw JSONB payload against the guard for the given kind. */
export function isPayloadForKind<K extends AdKind>(
  kind: K,
  value: unknown
): value is AdPayloadByKind[K] {
  return PAYLOAD_GUARDS[kind](value);
}
