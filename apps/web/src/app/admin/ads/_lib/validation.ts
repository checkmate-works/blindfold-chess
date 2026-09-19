import { SUPPORTED_LOCALES } from '@/config';

import type { NativeCardPayload } from '@/lib/ads/payload';
import type { AdKind } from '@/lib/ads/registry';
import { isAdSlot } from '@/lib/ads/registry';
import { MAX_LINK_HREF_LENGTH, classifyLinkTarget } from '@/lib/content/link-target';

export type CreateAdCreativeData = {
  slot: string;
  href: string;
  isActive: boolean;
  payload: NativeCardPayload;
};

export type UpdateAdCreativeData = {
  href: string;
  isActive: boolean;
  payload: NativeCardPayload;
};

/**
 * Length caps enforced by these validators, exported so the forms' input
 * `maxLength` attributes are the same numbers and cannot drift.
 */
export const AD_CREATIVE_LIMITS = {
  /** Same cap `classifyLinkTarget` enforces, so the form's `maxLength` and
   * the validator's rejection threshold are one number. */
  href: MAX_LINK_HREF_LENGTH,
  imagePath: 1024,
  alt: 255,
  /** Title / description copy. */
  text: 2000,
  /** Thumbnail board FEN (a full FEN is well under 100 chars). */
  fen: 100,
} as const;

/**
 * A creative's click-through must be an absolute `http:` / `https:` URL —
 * internal destinations are allowed (house ads point at our own pages), a
 * bare path is not, because the href is rendered from the stored value with
 * no page to resolve it against.
 *
 * A `clickref` already in the URL is rejected rather than accepted as an
 * override. `withCreativeSubId` leaves a pre-tagged URL alone, so such a link
 * reports every one of its clicks under whatever value is already there —
 * and the value that actually turns up is the sample Awin's own UI hands out
 * with the link, copied in by accident. Losing per-creative attribution
 * silently is worse than making the admin strip six characters.
 */
function validateHref(href: string): string | null {
  // The `string` type is a compile-time promise only: these validators run on
  // Server Action payloads, which arrive from the network unchecked.
  if (typeof href !== 'string') return 'invalid href';
  if (classifyLinkTarget(href) === 'unsafe') return 'invalid href';
  return /[?&]clickref=/.test(href) ? 'href already carries a clickref' : null;
}

function validateImagePath(imagePath: string): string | null {
  if (!imagePath || imagePath.length > AD_CREATIVE_LIMITS.imagePath) return 'invalid imagePath';
  return null;
}

function validateText(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > AD_CREATIVE_LIMITS.text) {
    return `invalid ${field}`;
  }
  return null;
}

/**
 * Per-locale copy: `en` must be there (every other locale falls back to it),
 * and each locale that *is* present gets the same length cap as the old
 * single string — the cap is about how much text a card can hold, which does
 * not change with the language. Unknown keys are rejected rather than stored
 * and silently never read.
 */
function validateLocalizedCopy(value: NativeCardPayload['title'], field: string): string | null {
  if (typeof value !== 'object' || value === null) return `invalid ${field}`;
  const copy = value as Record<string, unknown>;
  const enError = validateText(copy.en, `${field}.en`);
  if (enError) return enError;
  for (const key of Object.keys(copy)) {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(key)) return `invalid ${field} locale`;
    const localeError = validateText(copy[key], `${field}.${key}`);
    if (localeError) return localeError;
  }
  return null;
}

function validateThumbnail(thumbnail: NativeCardPayload['thumbnail']): string | null {
  if (thumbnail === undefined) return null;
  if (
    typeof thumbnail.fen !== 'string' ||
    thumbnail.fen.trim().length === 0 ||
    thumbnail.fen.length > AD_CREATIVE_LIMITS.fen
  ) {
    return 'invalid thumbnail fen';
  }
  if (thumbnail.imagePath !== undefined && thumbnail.imagePath !== null) {
    const imageError = validateImagePath(thumbnail.imagePath);
    if (imageError) return 'invalid thumbnail image';
  }
  if (thumbnail.imageAlt !== undefined && thumbnail.imageAlt.length > AD_CREATIVE_LIMITS.alt) {
    return 'invalid thumbnail alt';
  }
  return null;
}

function validateNativeCardPayload(payload: NativeCardPayload): string | null {
  if (payload.avatarImagePath !== null) {
    const imageError = validateImagePath(payload.avatarImagePath);
    if (imageError) return imageError;
  }
  if (typeof payload.avatarAlt !== 'string' || payload.avatarAlt.length > AD_CREATIVE_LIMITS.alt) {
    return 'invalid avatarAlt';
  }
  const titleError = validateLocalizedCopy(payload.title, 'title');
  if (titleError) return titleError;
  const descriptionError = validateLocalizedCopy(payload.description, 'description');
  if (descriptionError) return descriptionError;
  return validateThumbnail(payload.thumbnail);
}

/**
 * Validate a payload against the kind bound to its slot. `native_card` is the
 * only kind today; the indirection stays so a second kind is one branch here
 * rather than a rewrite of both call sites.
 */
export function validatePayloadForKind(_kind: AdKind, payload: NativeCardPayload): string | null {
  return validateNativeCardPayload(payload);
}

export function validateCreateAdCreative(data: CreateAdCreativeData): string | null {
  if (!isAdSlot(data.slot)) return 'invalid slot';
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  return validateNativeCardPayload(data.payload);
}

/** Update validation needs the row's kind (slot is immutable, from the DB). */
export function validateUpdateAdCreative(kind: AdKind, data: UpdateAdCreativeData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  return validatePayloadForKind(kind, data.payload);
}
