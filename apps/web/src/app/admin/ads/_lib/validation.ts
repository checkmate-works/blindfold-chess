import { SUPPORTED_LOCALES } from '@/config';

import type { BannerPayload, LocalizedText, NativeCardPayload } from '@/lib/ads/payload';
import type { AdKind } from '@/lib/ads/registry';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';

export type CreateAdCreativeData = {
  slot: string;
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  /** ISO-3166 alpha-2 target country; null = global. */
  targetCountry: string | null;
  payload: BannerPayload | NativeCardPayload;
};

export type UpdateAdCreativeData = {
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  targetCountry: string | null;
  payload: BannerPayload | NativeCardPayload;
};

const MAX_TEXT_LEN = 2000;

function validateTargetCountry(country: string | null): string | null {
  if (country === null) return null;
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) {
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

/**
 * A localized text map must only carry supported-locale keys, must have a
 * non-empty English fallback (the resolver's last-resort default), and every
 * present value must be a bounded non-empty string.
 */
function validateLocalizedText(text: LocalizedText, field: string): string | null {
  const keys = Object.keys(text);
  for (const key of keys) {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(key)) {
      return `invalid ${field} locale`;
    }
    const value = text[key as keyof LocalizedText];
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT_LEN) {
      return `invalid ${field}`;
    }
  }
  if (!text.en) return `${field} requires an English value`;
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

function validateNativeCardPayload(payload: NativeCardPayload): string | null {
  if (payload.avatarImagePath !== null) {
    const imageError = validateImagePath(payload.avatarImagePath);
    if (imageError) return imageError;
  }
  if (typeof payload.avatarAlt !== 'string' || payload.avatarAlt.length > 255) {
    return 'invalid avatarAlt';
  }
  const titleError = validateLocalizedText(payload.title, 'title');
  if (titleError) return titleError;
  return validateLocalizedText(payload.description, 'description');
}

/** Validate a payload against the kind bound to its slot. */
export function validatePayloadForKind(
  kind: AdKind,
  payload: BannerPayload | NativeCardPayload
): string | null {
  if (kind === 'banner') return validateBannerPayload(payload as BannerPayload);
  return validateNativeCardPayload(payload as NativeCardPayload);
}

function validateScheduleAndOrder(data: {
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
}): string | null {
  if (!Number.isInteger(data.sortOrder)) return 'invalid sortOrder';
  if (data.startAt && Number.isNaN(Date.parse(data.startAt))) return 'invalid startAt';
  if (data.endAt && Number.isNaN(Date.parse(data.endAt))) return 'invalid endAt';
  if (data.startAt && data.endAt && Date.parse(data.startAt) >= Date.parse(data.endAt)) {
    return 'startAt must be before endAt';
  }
  return null;
}

export function validateCreateAdCreative(data: CreateAdCreativeData): string | null {
  if (!isAdSlot(data.slot)) return 'invalid slot';
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const scheduleError = validateScheduleAndOrder(data);
  if (scheduleError) return scheduleError;
  const countryError = validateTargetCountry(data.targetCountry);
  if (countryError) return countryError;
  return validatePayloadForKind(kindForSlot(data.slot), data.payload);
}

/** Update validation needs the row's kind (slot is immutable, from the DB). */
export function validateUpdateAdCreative(kind: AdKind, data: UpdateAdCreativeData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const scheduleError = validateScheduleAndOrder(data);
  if (scheduleError) return scheduleError;
  const countryError = validateTargetCountry(data.targetCountry);
  if (countryError) return countryError;
  return validatePayloadForKind(kind, data.payload);
}
