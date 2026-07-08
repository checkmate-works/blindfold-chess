import type { BannerPayload, NativeCardPayload } from '@/lib/ads/payload';
import type { AdKind } from '@/lib/ads/registry';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';
import { isValidCountryCode } from '@/lib/countries';

export type CreateAdCreativeData = {
  slot: string;
  href: string;
  isActive: boolean;
  /** ISO-3166 alpha-2 target country; null = global. */
  targetCountry: string | null;
  payload: BannerPayload | NativeCardPayload;
};

export type UpdateAdCreativeData = {
  href: string;
  isActive: boolean;
  targetCountry: string | null;
  payload: BannerPayload | NativeCardPayload;
};

const MAX_TEXT_LEN = 2000;

function validateTargetCountry(country: string | null): string | null {
  if (country === null) return null;
  // Must be a real ISO 3166-1 alpha-2 code, not just two letters — this
  // rejects typos like "UK" (the ISO code is "GB"), "XX", etc.
  if (typeof country !== 'string' || !isValidCountryCode(country)) {
    return 'invalid country code';
  }
  return null;
}

function validateHref(href: string): string | null {
  if (!href || href.length > 2048) return 'invalid href';
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol)) return 'invalid href';
  } catch {
    return 'invalid href';
  }
  return null;
}

function validateImagePath(imagePath: string): string | null {
  if (!imagePath || imagePath.length > 1024) return 'invalid imagePath';
  return null;
}

function validateText(value: string, field: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT_LEN) {
    return `invalid ${field}`;
  }
  return null;
}

function validateBannerPayload(payload: BannerPayload): string | null {
  const imageError = validateImagePath(payload.imagePath);
  if (imageError) return imageError;
  if (typeof payload.alt !== 'string' || payload.alt.length > 255) return 'invalid alt';
  if (!payload.width || payload.width <= 0) return 'invalid width';
  if (!payload.height || payload.height <= 0) return 'invalid height';
  return null;
}

function validateThumbnail(thumbnail: NativeCardPayload['thumbnail']): string | null {
  if (thumbnail === undefined) return null;
  if (thumbnail.type === 'board') {
    if (typeof thumbnail.fen !== 'string' || thumbnail.fen.trim().length === 0) {
      return 'invalid thumbnail fen';
    }
    return null;
  }
  if (thumbnail.type === 'image') {
    const imageError = validateImagePath(thumbnail.imagePath);
    if (imageError) return 'invalid thumbnail image';
    if (typeof thumbnail.alt !== 'string' || thumbnail.alt.length > 255) {
      return 'invalid thumbnail alt';
    }
    return null;
  }
  return 'invalid thumbnail';
}

function validateNativeCardPayload(payload: NativeCardPayload): string | null {
  if (payload.avatarImagePath !== null) {
    const imageError = validateImagePath(payload.avatarImagePath);
    if (imageError) return imageError;
  }
  if (typeof payload.avatarAlt !== 'string' || payload.avatarAlt.length > 255) {
    return 'invalid avatarAlt';
  }
  const titleError = validateText(payload.title, 'title');
  if (titleError) return titleError;
  const descriptionError = validateText(payload.description, 'description');
  if (descriptionError) return descriptionError;
  return validateThumbnail(payload.thumbnail);
}

/** Validate a payload against the kind bound to its slot. */
export function validatePayloadForKind(
  kind: AdKind,
  payload: BannerPayload | NativeCardPayload
): string | null {
  if (kind === 'banner') return validateBannerPayload(payload as BannerPayload);
  return validateNativeCardPayload(payload as NativeCardPayload);
}

export function validateCreateAdCreative(data: CreateAdCreativeData): string | null {
  if (!isAdSlot(data.slot)) return 'invalid slot';
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const countryError = validateTargetCountry(data.targetCountry);
  if (countryError) return countryError;
  return validatePayloadForKind(kindForSlot(data.slot), data.payload);
}

/** Update validation needs the row's kind (slot is immutable, from the DB). */
export function validateUpdateAdCreative(kind: AdKind, data: UpdateAdCreativeData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const countryError = validateTargetCountry(data.targetCountry);
  if (countryError) return countryError;
  return validatePayloadForKind(kind, data.payload);
}
