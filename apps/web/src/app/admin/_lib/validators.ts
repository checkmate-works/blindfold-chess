import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Shared field validators for admin mutation data.
 *
 * Each function returns an error message string when the field is invalid,
 * or `null` when valid — matching the convention used by the per-feature
 * `validate*Data` functions. Feature-level validators (articles,
 * announcements, grants, coins) compose these so the slug/title/locale/
 * status/published-date/user-id rules live in exactly one place.
 */

const VALID_STATUSES = ['draft', 'published'] as const;

export function validateSlug(slug: string): string | null {
  return !slug || slug.length > 255 ? 'invalid slug' : null;
}

export function validateTitle(title: string): string | null {
  return !title || title.length > 255 ? 'invalid title' : null;
}

export function validateLocale(locale: string): string | null {
  return !locale || locale.length > 10 ? 'invalid locale' : null;
}

export function validateStatus(status: string): string | null {
  return VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ? null
    : 'invalid status';
}

export function validatePublishedDate(status: string, publishedAt: string | null): string | null {
  return status === 'published' && !publishedAt
    ? 'Published date is required when status is published'
    : null;
}

export function validateUserId(id: string): string | null {
  return UUID_RE.test(id) ? null : `Invalid User ID format: ${id}`;
}
