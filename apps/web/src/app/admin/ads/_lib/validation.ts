import { SUPPORTED_LOCALES } from '@/config';

import type { LocalizedCopy } from '@/lib/ads/copy';
import type { AdKind } from '@/lib/ads/registry';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';
import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { MAX_LINK_HREF_LENGTH, classifyLinkTarget } from '@/lib/content/link-target';

/**
 * A creative as the forms submit it: every field of every kind, with the
 * fields the kind does not have set to `null`. The slot decides the kind, and
 * {@link validateFieldsForKind} holds each kind to its own shape — the same
 * rule `ad_creatives_chk_fields_for_kind` enforces in the database, checked
 * here first so the admin sees a named field rather than a constraint name.
 */
export type AdCreativeFields = {
  href: string;
  isActive: boolean;
  /** `native_tile` only; `null` on a card. */
  icon: string | null;
  /** `native_card` only; `null` on a tile. */
  avatarImagePath: string | null;
  avatarAlt: string | null;
  thumbnail: NativeCardThumbnail;
  title: LocalizedCopy;
  description: LocalizedCopy;
};

export type CreateAdCreativeData = AdCreativeFields & { slot: string };

export type UpdateAdCreativeData = AdCreativeFields;

/**
 * Length caps enforced by these validators, exported so the forms' input
 * `maxLength` attributes are the same numbers and cannot drift. Each one is
 * also the width of the column it lands in (`@/lib/db/schema/notifications`).
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
  /** The tile's emoji. Long enough for a multi-codepoint emoji sequence
   * (skin tone, ZWJ) and short enough that nothing else fits. */
  icon: 16,
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

function validateImagePath(imagePath: unknown, field: string): string | null {
  if (
    typeof imagePath !== 'string' ||
    !imagePath ||
    imagePath.length > AD_CREATIVE_LIMITS.imagePath
  ) {
    return `invalid ${field}`;
  }
  return null;
}

function validateAlt(alt: unknown, field: string): string | null {
  if (typeof alt !== 'string' || alt.length > AD_CREATIVE_LIMITS.alt) return `invalid ${field}`;
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
 * and each locale that *is* present gets the same length cap — the cap is
 * about how much text a card can hold, which does not change with the
 * language. Unknown keys are rejected rather than stored and silently never
 * read.
 */
function validateLocalizedCopy(value: unknown, field: string): string | null {
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

function validateThumbnail(thumbnail: unknown): string | null {
  if (typeof thumbnail !== 'object' || thumbnail === null) return 'invalid thumbnail';
  const t = thumbnail as Record<string, unknown>;
  if (
    typeof t.fen !== 'string' ||
    t.fen.trim().length === 0 ||
    t.fen.length > AD_CREATIVE_LIMITS.fen
  ) {
    return 'invalid thumbnail fen';
  }
  if (t.imagePath !== undefined && t.imagePath !== null) {
    const imageError = validateImagePath(t.imagePath, 'thumbnail image');
    if (imageError) return imageError;
  }
  if (t.imageAlt !== undefined) {
    const altError = validateAlt(t.imageAlt, 'thumbnail alt');
    if (altError) return altError;
  }
  return null;
}

/** The fields every kind carries. */
function validateCommonFields(fields: AdCreativeFields): string | null {
  const titleError = validateLocalizedCopy(fields.title, 'title');
  if (titleError) return titleError;
  const descriptionError = validateLocalizedCopy(fields.description, 'description');
  if (descriptionError) return descriptionError;
  return validateThumbnail(fields.thumbnail);
}

function validateNativeCardFields(fields: AdCreativeFields): string | null {
  if (fields.icon !== null) return 'invalid icon';
  if (fields.avatarImagePath !== null) {
    const imageError = validateImagePath(fields.avatarImagePath, 'avatar image');
    if (imageError) return imageError;
  }
  if (fields.avatarAlt !== null) {
    const altError = validateAlt(fields.avatarAlt, 'avatarAlt');
    if (altError) return altError;
  }
  return validateCommonFields(fields);
}

/**
 * `icon` is checked for presence and length only. Which emoji it is is an
 * editorial judgement the admin makes, not something a validator can hold an
 * opinion about.
 */
function validateNativeTileFields(fields: AdCreativeFields): string | null {
  if (
    typeof fields.icon !== 'string' ||
    fields.icon.trim().length === 0 ||
    fields.icon.length > AD_CREATIVE_LIMITS.icon
  ) {
    return 'invalid icon';
  }
  if (fields.avatarImagePath !== null || fields.avatarAlt !== null) return 'invalid avatar';
  return validateCommonFields(fields);
}

/**
 * Validate the fields against the kind bound to the slot. Exhaustive over
 * `AdKind`, so a third kind is a compile error here rather than a row that
 * reaches the DB unchecked.
 */
export function validateFieldsForKind(kind: AdKind, fields: AdCreativeFields): string | null {
  switch (kind) {
    case 'native_card':
      return validateNativeCardFields(fields);
    case 'native_tile':
      return validateNativeTileFields(fields);
  }
}

export function validateCreateAdCreative(data: CreateAdCreativeData): string | null {
  if (!isAdSlot(data.slot)) return 'invalid slot';
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  // The slot decides the kind, so the fields are checked against the shape
  // this slot can actually render — not against whichever kind came first.
  return validateFieldsForKind(kindForSlot(data.slot), data);
}

/** Update validation needs the row's kind (slot is immutable, from the DB). */
export function validateUpdateAdCreative(kind: AdKind, data: UpdateAdCreativeData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  return validateFieldsForKind(kind, data);
}
