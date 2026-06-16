'use client';

import { useCallback, useEffect } from 'react';

import { createPortal } from 'react-dom';
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';

export type LightboxImage = {
  id: string;
  publicUrl: string;
  width: number;
  height: number;
  altText: string | null;
};

type Props = {
  images: readonly LightboxImage[];
  /** Index of the currently displayed image. */
  index: number;
  /** Move to another image (wraps). No-op when there is only one image. */
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * Fullscreen image viewer for post image attachments.
 *
 * @design Why a bespoke overlay instead of `Modal`
 *
 * `Modal` is a centered card surface; a lightbox wants an edge-to-edge
 * dark backdrop with the image filling most of the viewport and
 * prev/next affordances. The interaction set is small (Esc / arrows /
 * click-backdrop to close), so a focused component is simpler than
 * bending `Modal`. Rendered through a portal to `document.body` (same as
 * `Modal`) so it escapes any `overflow`/stacking context of the thread.
 *
 * The displayed image is the stored object — uploads are already capped
 * to a 1600px long edge server-side (`normalizePostImageBuffer`), so
 * there is no separate "full-res" original to fetch.
 */
export function ImageLightbox({ images, index, onIndexChange, onClose }: Props) {
  const count = images.length;

  const goPrev = useCallback(() => {
    if (count > 1) onIndexChange((index - 1 + count) % count);
  }, [count, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (count > 1) onIndexChange((index + 1) % count);
  }, [count, index, onIndexChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, goPrev, goNext]);

  // Lock background scroll while open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const image = images[index];
  if (!image) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      // TODO(i18n): attachment.image.lightbox.label
      aria-label="Image viewer"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        // TODO(i18n): attachment.image.lightbox.close
        aria-label="Close"
        className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <FaTimes aria-hidden="true" className="h-5 w-5" />
      </button>

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          // TODO(i18n): attachment.image.lightbox.previous
          aria-label="Previous image"
          className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <FaChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.publicUrl}
        alt={image.altText ?? ''}
        width={image.width}
        height={image.height}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          // TODO(i18n): attachment.image.lightbox.next
          aria-label="Next image"
          className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <FaChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      )}

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {index + 1} / {count}
        </div>
      )}
    </div>,
    document.body
  );
}
