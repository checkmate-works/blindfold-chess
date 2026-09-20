'use client';

import { Field, Input } from '@/app/admin/_components/forms';

import { DEFAULT_NATIVE_THUMBNAIL_FEN } from '@/lib/ads/payload';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';
import { ImageFileButton } from './ImageFileButton';

type Props = {
  mode: 'create' | 'edit';
  labels: AdCreativeFormLabels;
  fen: string;
  onFenChange: (value: string) => void;
  imagePath: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading: boolean;
  alt: string;
  onAltChange: (value: string) => void;
};

/**
 * The thumbnail fieldset: a board FEN that is always present, plus an
 * optional uploaded image that overrides it, plus that image's alt text.
 *
 * Shared by every kind's form because the thumbnail is the part of a
 * creative that does not vary by kind — a tile and a card show the same
 * picture in differently shaped frames. Upload is disabled until the
 * creative has an id to file the object under, which is why `mode` shows a
 * hint instead of a button on create.
 */
export function CreativeThumbnailFields({
  mode,
  labels,
  fen,
  onFenChange,
  imagePath,
  onUpload,
  onRemove,
  isUploading,
  alt,
  onAltChange,
}: Props) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{labels.thumbnail}</span>
      <div className="space-y-4">
        {/* Board (FEN) — always present; the fallback when no image is set. */}
        <div className="flex items-start gap-3">
          <CreativeThumbnail
            fen={fen.trim() || DEFAULT_NATIVE_THUMBNAIL_FEN}
            className="w-24 h-24 shrink-0 overflow-hidden rounded border border-border"
          />
          <div className="flex-1">
            <Input
              id="thumbnailFen"
              type="text"
              value={fen}
              onChange={(e) => onFenChange(e.target.value)}
              placeholder={labels.thumbnailFenPlaceholder}
              maxLength={AD_CREATIVE_LIMITS.fen}
            />
            <p className="mt-1 text-xs text-muted-foreground">{labels.thumbnailFen}</p>
          </div>
        </div>

        {/* Optional override image — wins over the board when present. */}
        <div>
          <span className="block text-sm font-medium mb-1">{labels.thumbnailImageOverride}</span>
          <div className="flex items-center gap-3">
            <CreativeThumbnail
              imagePath={imagePath}
              imageAlt={alt}
              className="w-24 h-24 shrink-0 overflow-hidden rounded border border-border"
              placeholder={
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  —
                </div>
              }
            />
            {mode === 'edit' ? (
              <div className="flex flex-col gap-2">
                <ImageFileButton
                  idleLabel={labels.thumbnailImageUpload}
                  busyLabel={labels.thumbnailImageUploading}
                  busy={isUploading}
                  onFile={onUpload}
                  className="text-center"
                />
                {imagePath && (
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={isUploading}
                    className="px-3 py-1.5 text-sm rounded border border-border text-destructive-soft-foreground hover:bg-destructive-soft transition-colors disabled:opacity-50"
                  >
                    {labels.thumbnailImageRemove}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{labels.thumbnailImageHintCreate}</p>
            )}
          </div>
          {imagePath && (
            <div className="mt-2">
              <Field label={labels.thumbnailAlt} htmlFor="thumbnailAlt">
                <Input
                  id="thumbnailAlt"
                  type="text"
                  value={alt}
                  onChange={(e) => onAltChange(e.target.value)}
                  maxLength={AD_CREATIVE_LIMITS.alt}
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
