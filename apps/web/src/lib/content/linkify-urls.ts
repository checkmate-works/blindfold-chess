/**
 * URL linkification utilities — web wrapper.
 *
 * The core logic lives in @blindfold-chess/features/linkify.
 * This file binds SITE_DOMAIN for web-specific usage.
 */
import { SITE_DOMAIN } from '@/config';
import {
  type LinkSegment,
  isInternalUrl as isInternalUrlCore,
  linkifyText as linkifyTextCore,
} from '@blindfold-chess/features/linkify';

export type { LinkSegment } from '@blindfold-chess/features/linkify';
export { buildCushionPageUrl, isDangerousUrl } from '@blindfold-chess/features/linkify';

export function isInternalUrl(href: string): boolean {
  return isInternalUrlCore(href, SITE_DOMAIN);
}

export function linkifyText(text: string): LinkSegment[] {
  return linkifyTextCore(text, SITE_DOMAIN);
}
