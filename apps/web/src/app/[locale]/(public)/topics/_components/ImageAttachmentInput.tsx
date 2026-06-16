'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FaImage, FaTimes } from 'react-icons/fa';

import { MAX_IMAGES_PER_POST, POST_IMAGES_MAX_FILE_SIZE } from '@/lib/post-images/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Image-only attachment input
 *
 * The Game family (PGN / Lichess URL) uses `<AttachmentInput>` with
 * auto-detect from a single textarea; FEN lives in `<FenAttachmentInput>`.
 * Images get their own tab/input because the input modality (a file
 * picker) is too different to fold into an auto-detect textarea. Video
 * is intentionally NOT offered — only still images are supported.
 *
 * The parent form composes the inputs into the AttachmentModal tabs and
 * enforces single-kind submission via the reported `mode` (SPEC2 D3
 * case (iii)).
 */
export type ImageAttachmentMode = { kind: 'empty' } | { kind: 'image'; files: readonly File[] };

/**
 * Validation status surfaced to the parent. See AttachmentInput.tsx for
 * the contract — same three-state union, used by AttachmentModal to
 * disable the Apply button when the active tab is in `error`. The image
 * input never reports `'error'` client-side: file count is clamped to
 * `MAX_IMAGES_PER_POST` and per-file size / MIME validation is
 * authoritative server-side in `/api/posts/[id]/images`.
 */
export type ValidationStatus = 'empty' | 'ok' | 'error';

type Props = {
  /** Notify the parent form when the input becomes non-empty. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in. */
  onModeChange?: (mode: ImageAttachmentMode) => void;
  /** Notify the parent of the current validation status so it can
   *  disable the Apply button while the active tab is in `error`. */
  onValidationStatusChange?: (status: ValidationStatus) => void;
};

// jsdom does not implement `URL.createObjectURL`, so guard it — the
// preview thumbnails are a no-op under test (the file list still drives
// the mode/validation effects that the tests assert on).
function createPreviewUrl(file: File): string {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
}
function revokePreviewUrl(url: string): void {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
}

function isSameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export function ImageAttachmentInput({ onChange, onModeChange, onValidationStatusChange }: Props) {
  const [imageFiles, setImageFiles] = useState<readonly File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mode: ImageAttachmentMode =
      imageFiles.length > 0 ? { kind: 'image', files: imageFiles } : { kind: 'empty' };
    onModeChange?.(mode);
    onChange?.(mode.kind !== 'empty');
  }, [imageFiles, onChange, onModeChange]);

  useEffect(() => {
    onValidationStatusChange?.(imageFiles.length === 0 ? 'empty' : 'ok');
  }, [imageFiles, onValidationStatusChange]);

  // Object-URL previews. Recreated whenever the selection changes; the
  // cleanup return revokes the previous batch (and the final batch on
  // unmount) so blobs are not leaked.
  const previews = useMemo(
    () => imageFiles.map((file) => ({ file, url: createPreviewUrl(file) })),
    [imageFiles]
  );
  useEffect(() => () => previews.forEach((p) => revokePreviewUrl(p.url)), [previews]);

  const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    setImageFiles((prev) => {
      const merged = [...prev];
      for (const file of picked) {
        if (merged.length >= MAX_IMAGES_PER_POST) break;
        if (!merged.some((m) => isSameFile(m, file))) merged.push(file);
      }
      return merged;
    });
    // Reset so re-picking a just-removed file fires `change` again.
    e.target.value = '';
  }, []);

  const removeAt = useCallback(
    (index: number) => setImageFiles((prev) => prev.filter((_, i) => i !== index)),
    []
  );

  const atMax = imageFiles.length >= MAX_IMAGES_PER_POST;
  const maxFileSizeMb = Math.round(POST_IMAGES_MAX_FILE_SIZE / 1024 / 1024);

  return (
    <div className="space-y-3">
      {/* Visually hidden native picker, driven by the button below. Kept
          in the DOM (with its id/accept) so server-side validation and
          tests can address it directly. */}
      <input
        ref={inputRef}
        id="attachmentImageFiles"
        name="attachmentImageFiles"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesChange}
        className="sr-only"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={atMax}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaImage aria-hidden="true" className="h-4 w-4" />
          {/* TODO(i18n): attachment.image.chooseButton */}
          Choose images
        </button>
        <p className="text-xs text-muted-foreground">
          {imageFiles.length} / {MAX_IMAGES_PER_POST}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        {/* TODO(i18n): attachment.image.limitHint */}
        JPEG, PNG, or WebP. Up to {MAX_IMAGES_PER_POST} per post, {maxFileSizeMb} MB each.
      </p>

      {previews.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <li key={preview.url || `${preview.file.name}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.file.name}
                className="aspect-square w-full rounded-md border border-border bg-muted object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                // TODO(i18n): attachment.image.removeAriaLabel
                aria-label={`Remove ${preview.file.name}`}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <FaTimes aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
