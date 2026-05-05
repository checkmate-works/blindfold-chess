'use client';

import { useCallback, useEffect, useState } from 'react';

import { MAX_IMAGES_PER_POST, POST_IMAGES_MAX_FILE_SIZE } from '@/lib/post-images/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Why a separate Media expander
 *
 * The Game family (PGN / chesscom-embed / lichess-embed) uses
 * `<AttachmentInput>` with auto-detect from a single textarea — the
 * existing UX. The Media family (image / video) splits into dedicated
 * sub-inputs because the input modalities (file picker, URL parser) are
 * too different to fold into one auto-detect. FEN now lives in its own
 * tab via `<FenAttachmentInput>`.
 *
 * The parent form composes the expanders into the AttachmentModal tabs
 * and enforces single-kind submission via the reported `mode` (SPEC2
 * D3 case (iii)).
 */
export type MediaAttachmentMode =
  | { kind: 'empty' }
  | { kind: 'image'; files: readonly File[] }
  | { kind: 'video'; url: string };

type Props = {
  /** Notify the parent form when the input becomes non-empty. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in. */
  onModeChange?: (mode: MediaAttachmentMode) => void;
};

type SubKind = 'image' | 'video';

export function MediaAttachmentInput({ onChange, onModeChange }: Props) {
  const [subKind, setSubKind] = useState<SubKind>('image');

  const [imageFiles, setImageFiles] = useState<readonly File[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    if (subKind === 'image') {
      const mode: MediaAttachmentMode =
        imageFiles.length > 0 ? { kind: 'image', files: imageFiles } : { kind: 'empty' };
      onModeChange?.(mode);
      onChange?.(mode.kind !== 'empty');
      return;
    }
    if (subKind === 'video') {
      const trimmed = videoUrl.trim();
      const mode: MediaAttachmentMode =
        trimmed.length > 0 ? { kind: 'video', url: trimmed } : { kind: 'empty' };
      onModeChange?.(mode);
      onChange?.(mode.kind !== 'empty');
    }
  }, [subKind, imageFiles, videoUrl, onChange, onModeChange]);

  const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setImageFiles(files.slice(0, MAX_IMAGES_PER_POST));
  }, []);

  return (
    <div className="space-y-3">
      {/* Sub-kind selector */}
      <div role="radiogroup" aria-label="Media kind" className="flex gap-3 text-sm">
        {(['image', 'video'] as const).map((kind) => (
          <label key={kind} className="flex items-center gap-1.5 text-foreground">
            <input
              type="radio"
              name="mediaAttachmentKind"
              value={kind}
              checked={subKind === kind}
              onChange={() => setSubKind(kind)}
            />
            {/* TODO(i18n): attachment.media.kind.<kind> */}
            <span className="capitalize">{kind}</span>
          </label>
        ))}
      </div>

      {subKind === 'image' && (
        <ImageInput
          files={imageFiles}
          onChange={handleFilesChange}
          onClear={() => setImageFiles([])}
        />
      )}

      {subKind === 'video' && <VideoInput url={videoUrl} onChange={setVideoUrl} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type ImageInputProps = {
  files: readonly File[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

function ImageInput({ files, onChange, onClear }: ImageInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="attachmentImageFiles" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.image.label (existing key reused for label) */}
        Images
      </label>
      <input
        id="attachmentImageFiles"
        name="attachmentImageFiles"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onChange}
        className="block text-sm text-foreground"
      />
      <p className="text-xs text-muted-foreground">
        {/* TODO(i18n): attachment.image.limitHint (existing key) */}
        JPEG, PNG, or WebP. Up to {MAX_IMAGES_PER_POST} per post,{' '}
        {Math.round(POST_IMAGES_MAX_FILE_SIZE / 1024 / 1024)} MB each.
      </p>
      {files.length > 0 && (
        <div>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {files.map((file, idx) => (
              <li key={`${file.name}-${idx}`} className="truncate">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-xs text-link-primary hover:underline"
          >
            {/* TODO(i18n): attachment.image.clear */}
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

type VideoInputProps = {
  url: string;
  onChange: (value: string) => void;
};

function VideoInput({ url, onChange }: VideoInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="attachmentVideoUrl" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.video.input.label */}
        YouTube URL
      </label>
      <input
        id="attachmentVideoUrl"
        name="attachmentVideoUrl"
        type="url"
        maxLength={512}
        placeholder="https://www.youtube.com/watch?v=…"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground"
      />
      <p className="text-xs text-muted-foreground">
        {/* TODO(i18n): attachment.video.input.hint */}
        Paste a YouTube URL (watch / shorts / live / embed). Server validates the URL on submit.
      </p>
    </div>
  );
}
