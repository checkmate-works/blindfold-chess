import { SUPPORTED_LOCALES } from '@/config';

import type { LocalizedCopy } from '@/lib/ads/copy';
import { isPlaceholderAdHref } from '@/lib/ads/placeholder';
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

/**
 * A creative may not be switched on while its link still points at a
 * documentation host. Every slot ships with a seeded placeholder so the admin
 * has an example of the slot's card to edit (`@/lib/db/seed/ads`), and the one
 * field an example cannot supply is the destination; activating it as it
 * stands would put a card on a live surface whose click goes to
 * `example.com`.
 *
 * Checked here rather than only in `setAdCreativeActive` because the toggle on
 * the slot list is not the only way to turn a creative on — the edit form has
 * an Active checkbox, and saving it goes through the validator instead. The
 * rule has to sit on both paths or it only covers the one an admin happens not
 * to use.
 *
 * An inactive creative with a placeholder href is fine and is the whole point:
 * the seed writes exactly that, and a half-finished draft should be saveable.
 */
function validateActivation(fields: AdCreativeFields): string | null {
  if (!fields.isActive) return null;
  return isPlaceholderAdHref(fields.href) ? 'href is still the placeholder' : null;
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
 * A thumb is a board thumbnail and a one-line title: no emoji, no author row.
 *
 * Its description is still required, and that is a storage contract rather
 * than a rendering one — `ad_creative_translations_chk_en_complete` holds the
 * `en` row to both fields, because every other locale falls back to it field
 * by field. The thumb tile never draws the description; the authoring form
 * says so beside the input, so nobody spends time on copy that has no place
 * to appear. Relaxing the constraint per kind would mean teaching the
 * fallback which fields a kind uses, which is a larger change than the one
 * unused string it would save.
 */
function validateNativeThumbFields(fields: AdCreativeFields): string | null {
  if (fields.icon !== null) return 'invalid icon';
  if (fields.avatarImagePath !== null || fields.avatarAlt !== null) return 'invalid avatar';
  return validateCommonFields(fields);
}

/**
 * Validate the fields against the kind bound to the slot. Exhaustive over
 * `AdKind`, so a new kind is a compile error here rather than a row that
 * reaches the DB unchecked.
 */
export function validateFieldsForKind(kind: AdKind, fields: AdCreativeFields): string | null {
  switch (kind) {
    case 'native_card':
      return validateNativeCardFields(fields);
    case 'native_tile':
      return validateNativeTileFields(fields);
    case 'native_thumb':
      return validateNativeThumbFields(fields);
  }
}

export function validateCreateAdCreative(data: CreateAdCreativeData): string | null {
  if (!isAdSlot(data.slot)) return 'invalid slot';
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const activationError = validateActivation(data);
  if (activationError) return activationError;
  // The slot decides the kind, so the fields are checked against the shape
  // this slot can actually render — not against whichever kind came first.
  return validateFieldsForKind(kindForSlot(data.slot), data);
}

/** Update validation needs the row's kind (slot is immutable, from the DB). */
export function validateUpdateAdCreative(kind: AdKind, data: UpdateAdCreativeData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const activationError = validateActivation(data);
  if (activationError) return activationError;
  return validateFieldsForKind(kind, data);
}

/**
 * A link applied to every creative sharing one English title
 * (`setAdCreativeHrefByTitle`). The same rules as the edit form's href, plus
 * one: the placeholder is refused outright. The rows it lands on may already
 * be active, and the per-row forms only allow a placeholder on an inactive
 * row — so a bulk write of it would put active cards back on a link that
 * goes nowhere. There is no reason to write the placeholder in bulk anyway;
 * stopping a book is the active toggle's job.
 */
export function validateBulkCreativeHref(href: string): string | null {
  const hrefError = validateHref(href);
  if (hrefError) return hrefError;
  return isPlaceholderAdHref(href) ? 'href is still the placeholder' : null;
}

/**
 * Switching on every creative that shares one English title
 * (`setAdCreativeActiveByTitle`), given the links those rows carry now. The
 * gate is the one on switching a single row on, applied to the whole group:
 * if any row is still on the placeholder, none of them is switched on.
 *
 * Refusing the group rather than activating the rows that are ready is
 * deliberate. A book whose link was pasted per row, and missed in one slot,
 * would otherwise go live everywhere except that slot and report success —
 * and nothing on a live page tells the admin a slot is dark. The error sends
 * them back to the link field, which fixes every row at once.
 */
export function validateBulkActivation(hrefs: readonly string[]): string | null {
  if (hrefs.length === 0) return 'not found';
  return hrefs.some(isPlaceholderAdHref) ? 'href is still the placeholder' : null;
}
