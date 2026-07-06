import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AdKind } from './registry';

/**
 * Per-locale free text stored inside a creative payload. Partial because a
 * future locale added to `SUPPORTED_LOCALES` won't exist on already-saved
 * rows — always read through `resolveLocalizedText`, never index directly.
 */
export type LocalizedText = Partial<Record<Locale, string>>;

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
 * back to a text placeholder (see `NativeAdCard`).
 */
export type NativeCardPayload = {
  avatarImagePath: string | null;
  avatarAlt: string;
  title: LocalizedText;
  description: LocalizedText;
};

export type AdPayloadByKind = {
  banner: BannerPayload;
  native_card: NativeCardPayload;
};

/**
 * Resolve localized text with a stable fallback chain: requested locale →
 * English → any populated value → empty string. Mirrors the runtime
 * fallback posture of `SITE_NAMES` so a missing translation degrades to
 * something readable instead of `undefined`.
 */
export function resolveLocalizedText(text: LocalizedText, locale: Locale): string {
  const requested = text[locale];
  if (requested) return requested;
  if (text.en) return text.en;
  for (const value of Object.values(text)) {
    if (value) return value;
  }
  return '';
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).every(
    ([key, val]) =>
      (SUPPORTED_LOCALES as readonly string[]).includes(key) && typeof val === 'string'
  );
}

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
    isLocalizedText(p.title) &&
    isLocalizedText(p.description)
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
