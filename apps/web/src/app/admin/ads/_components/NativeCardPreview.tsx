'use client';

import Image from 'next/image';

import type { NativeCardThumbnail } from '@/lib/ads/payload';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

type Props = {
  avatarImagePath: string | null;
  avatarAlt: string;
  title: string;
  description: string;
  thumbnail: NativeCardThumbnail;
  /** Section heading (e.g. "Preview"). */
  label: string;
  /** Caption noting the chrome text is localized at render time. */
  caption: string;
};

/**
 * A self-contained, live preview of how a native-card creative renders in the
 * feed. Deliberately does NOT reuse the real `NativeAdCard`: that component
 * depends on `GamePreferencesContext`, next-intl, and locale-aware routing,
 * none of which exist under the (locale-less) admin layout. This mirrors the
 * card's layout closely enough to judge the thumbnail, avatar, and copy while
 * editing. The chrome strings ("Ad" / sponsor / disclosure) are shown in
 * English here; the live card localizes them per viewer.
 */
export function NativeCardPreview({
  avatarImagePath,
  avatarAlt,
  title,
  description,
  thumbnail,
  label,
  caption,
}: Props) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex gap-3">
          <CreativeThumbnail
            imagePath={thumbnail.imagePath}
            imageAlt={thumbnail.imageAlt}
            fen={thumbnail.fen}
            className="h-24 w-24 shrink-0 overflow-hidden rounded border border-border"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {avatarImagePath ? (
                  <Image
                    src={avatarImagePath}
                    alt={avatarAlt}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    Ad
                  </div>
                )}
                <span className="font-medium text-foreground">Recommended Reading</span>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Ad
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{title || '—'}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
