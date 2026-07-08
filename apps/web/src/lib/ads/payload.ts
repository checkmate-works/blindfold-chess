import type { AdKind } from './registry';

/** Rectangle image banner (the generic, non-feed placements). */
export type BannerPayload = {
  imagePath: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * The native card's thumbnail — either a rendered chess board (a FEN) or an
 * uploaded image (e.g. a book cover). Discriminated by `type`.
 */
export type NativeCardThumbnail =
  | { type: 'board'; fen: string }
  | { type: 'image'; imagePath: string; alt: string };

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
  if (t.type === 'board') return typeof t.fen === 'string';
  if (t.type === 'image') return typeof t.imagePath === 'string' && typeof t.alt === 'string';
  return false;
}

/** The effective thumbnail: the payload's, or the default board when unset. */
export function resolveNativeThumbnail(payload: NativeCardPayload): NativeCardThumbnail {
  return payload.thumbnail ?? { type: 'board', fen: DEFAULT_NATIVE_THUMBNAIL_FEN };
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
  return (
    (p.avatarImagePath === null || typeof p.avatarImagePath === 'string') &&
    typeof p.avatarAlt === 'string' &&
    typeof p.title === 'string' &&
    typeof p.description === 'string' &&
    // Optional for backward compatibility; when present it must be well-formed.
    (p.thumbnail === undefined || isNativeCardThumbnail(p.thumbnail))
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
