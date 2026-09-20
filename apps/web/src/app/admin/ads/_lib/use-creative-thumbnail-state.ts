'use client';

import { useState } from 'react';

import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { DEFAULT_AD_ALT, DEFAULT_NATIVE_THUMBNAIL_FEN } from '@/lib/ads/thumbnail';

import type { useCreativeImageUpload } from './use-creative-image-upload';

/**
 * The thumbnail half of a creative form: the board FEN, the optional image
 * that overrides it, that image's alt, and the upload/remove handlers that
 * keep the local path in step with the API.
 *
 * Every native kind's form owns exactly this state and derived it the same
 * way, which is the point — a tile and a card show the same picture in
 * differently shaped frames, so the thumbnail is the part of a creative that
 * does not vary by kind. The hook takes the already-constructed
 * {@link useCreativeImageUpload} client rather than calling it itself
 * because the card form also uploads an avatar through the same client, and
 * its per-target busy flags only stay independent while there is one of it.
 *
 * `fieldProps` is the other half of the contract: it spreads straight into
 * `CreativeThumbnailFields`, which only needs `mode` and `labels` on top.
 */
export function useCreativeThumbnailState(
  initial: NativeCardThumbnail | undefined,
  images: ReturnType<typeof useCreativeImageUpload>
) {
  const start = initial ?? { fen: DEFAULT_NATIVE_THUMBNAIL_FEN };

  const [fen, setFen] = useState(start.fen);
  const [imagePath, setImagePath] = useState<string | null>(start.imagePath ?? null);
  const [alt, setAlt] = useState(start.imageAlt || DEFAULT_AD_ALT);

  const handleUpload = async (file: File) => {
    const path = await images.upload('thumbnail', file, alt);
    if (path) setImagePath(path);
  };

  const handleRemove = async () => {
    // With no saved creative yet, the image only lives in local state and
    // `remove` reports success without an API call.
    if (await images.remove('thumbnail')) setImagePath(null);
  };

  // The effective thumbnail from the current inputs: the board `fen` always,
  // plus the override image when one is set. Shared by the live preview and
  // submit.
  const current: NativeCardThumbnail = {
    fen: fen.trim() || DEFAULT_NATIVE_THUMBNAIL_FEN,
    ...(imagePath ? { imagePath, imageAlt: alt } : {}),
  };

  return {
    current,
    fieldProps: {
      fen,
      onFenChange: setFen,
      imagePath,
      onUpload: handleUpload,
      onRemove: handleRemove,
      isUploading: images.isBusy('thumbnail'),
      alt,
      onAltChange: setAlt,
    },
  };
}
