import type { AdKind } from './registry';

/** Rectangle image banner (the generic, non-feed placements). */
export type BannerPayload = {
  imagePath: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * In-feed native card — renders inside the timeline with the same shell as a
 * real feed item. `avatarImagePath` is nullable: when absent the card falls
 * back to a text placeholder (see `NativeAdCard`). `title`/`description` are
 * single strings, not per-locale maps: a creative is country-targeted
 * (`target_country`), so its copy is written in that country's language (or
 * English for a global creative).
 */
export type NativeCardPayload = {
  avatarImagePath: string | null;
  avatarAlt: string;
  title: string;
  description: string;
};

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
