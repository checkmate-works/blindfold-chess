import type { AdKind } from '@/lib/ads/registry';
import { DEFAULT_AD_ALT, thumbnailToColumns } from '@/lib/ads/thumbnail';
import type { adCreatives } from '@/lib/db';

import type { AdCreativeFields } from './validation';

/** The `ad_creatives` columns a form's fields become, minus slot and order. */
export type AdCreativeColumns = Pick<
  typeof adCreatives.$inferInsert,
  | 'kind'
  | 'href'
  | 'isActive'
  | 'icon'
  | 'avatarImagePath'
  | 'avatarAlt'
  | 'thumbnailFen'
  | 'thumbnailImagePath'
  | 'thumbnailImageAlt'
>;

/**
 * Validated fields as the row stores them. Two things are normalized rather
 * than rejected upstream, because the forms legitimately send them: the
 * emoji is trimmed, and an avatar alt with no avatar image is dropped — the
 * card form shows the alt input before an image can be uploaded (an upload
 * needs a creative id), so a fresh card arrives with an alt and no image,
 * and the row constraint stores alt only alongside an image.
 */
export function toAdCreativeColumns(kind: AdKind, fields: AdCreativeFields): AdCreativeColumns {
  return {
    kind,
    href: fields.href,
    isActive: fields.isActive,
    icon: kind === 'native_tile' ? (fields.icon?.trim() ?? null) : null,
    avatarImagePath: fields.avatarImagePath,
    avatarAlt: fields.avatarImagePath ? (fields.avatarAlt ?? DEFAULT_AD_ALT) : null,
    ...thumbnailToColumns(fields.thumbnail),
  };
}
