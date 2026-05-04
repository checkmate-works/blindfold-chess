'use client';

import { useCallback, useEffect, useState } from 'react';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';
import { MAX_IMAGES_PER_POST, POST_IMAGES_MAX_FILE_SIZE } from '@/lib/post-images/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Why a separate Media expander
 *
 * The Game family (PGN / chesscom-embed / lichess-embed) uses
 * `<AttachmentInput>` with auto-detect from a single textarea — the
 * existing UX. The Media family (image / fen / video) splits into
 * dedicated sub-inputs because the input modalities (file picker, FEN
 * regex, URL parser) are too different to fold into one auto-detect.
 *
 * The parent form composes both expanders side-by-side and enforces
 * single-kind submission via the reported `mode` (SPEC2 D3 case (iii)).
 */
export type MediaAttachmentMode =
  | { kind: 'empty' }
  | { kind: 'image'; files: readonly File[] }
  | { kind: 'fen'; fen: string; caption: string | null; valid: boolean }
  | { kind: 'video'; url: string };

type Props = {
  /** Notify the parent form when the input becomes non-empty. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in. */
  onModeChange?: (mode: MediaAttachmentMode) => void;
};

type SubKind = 'image' | 'fen' | 'video';

export function MediaAttachmentInput({ onChange, onModeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [subKind, setSubKind] = useState<SubKind>('image');

  // Each sub-input owns its local state. The aggregator below pulls
  // their reports together and forwards the merged mode to the parent.
  const [imageFiles, setImageFiles] = useState<readonly File[]>([]);
  const [fen, setFen] = useState('');
  const [fenCaption, setFenCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const fenTrimmed = fen.trim();
  const fenValidation =
    fenTrimmed.length > 0 && fenTrimmed.length <= 100
      ? validateFenSemantic(fenTrimmed)
      : { ok: false as const, reason: 'structure' as const, error: '' };
  const fenValid = fenValidation.ok;

  // Aggregate the active sub-input into the discriminated mode reported
  // to the parent. Inactive sub-inputs are not surfaced — the user must
  // use the kind selector to switch.
  useEffect(() => {
    if (!open) {
      onModeChange?.({ kind: 'empty' });
      onChange?.(false);
      return;
    }
    if (subKind === 'image') {
      const mode: MediaAttachmentMode =
        imageFiles.length > 0 ? { kind: 'image', files: imageFiles } : { kind: 'empty' };
      onModeChange?.(mode);
      onChange?.(mode.kind !== 'empty');
      return;
    }
    if (subKind === 'fen') {
      if (fenTrimmed.length === 0) {
        onModeChange?.({ kind: 'empty' });
        onChange?.(false);
        return;
      }
      onModeChange?.({
        kind: 'fen',
        fen: fenTrimmed,
        caption: fenCaption.trim().length > 0 ? fenCaption.trim() : null,
        valid: fenValid,
      });
      onChange?.(true);
      return;
    }
    if (subKind === 'video') {
      const trimmed = videoUrl.trim();
      const mode: MediaAttachmentMode =
        trimmed.length > 0 ? { kind: 'video', url: trimmed } : { kind: 'empty' };
      onModeChange?.(mode);
      onChange?.(mode.kind !== 'empty');
    }
  }, [
    open,
    subKind,
    imageFiles,
    fenTrimmed,
    fenCaption,
    fenValid,
    videoUrl,
    onChange,
    onModeChange,
  ]);

  const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setImageFiles(files.slice(0, MAX_IMAGES_PER_POST));
  }, []);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="text-sm text-link-primary hover:underline"
        onClick={() => setOpen((prev) => !prev)}
      >
        {/* TODO(i18n): attachment.media.expander */}
        {open ? 'Hide media attachment' : 'Attach media (image / FEN / video)'}
      </button>

      {open && (
        <div className="space-y-3 rounded-md border border-border bg-card p-3">
          {/* Sub-kind selector */}
          <div role="radiogroup" aria-label="Media kind" className="flex gap-3 text-sm">
            {(['image', 'fen', 'video'] as const).map((kind) => (
              <label key={kind} className="flex items-center gap-1.5 text-foreground">
                <input
                  type="radio"
                  name="mediaAttachmentKind"
                  value={kind}
                  checked={subKind === kind}
                  onChange={() => setSubKind(kind)}
                />
                {/* TODO(i18n): attachment.media.kind.<kind> */}
                <span className="capitalize">{kind === 'fen' ? 'FEN' : kind}</span>
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

          {subKind === 'fen' && (
            <FenInput
              fen={fen}
              caption={fenCaption}
              onFenChange={setFen}
              onCaptionChange={setFenCaption}
              valid={fenValid}
            />
          )}

          {subKind === 'video' && <VideoInput url={videoUrl} onChange={setVideoUrl} />}
        </div>
      )}
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

type FenInputProps = {
  fen: string;
  caption: string;
  onFenChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  valid: boolean;
};

function FenInput({ fen, caption, onFenChange, onCaptionChange, valid }: FenInputProps) {
  const fenTrimmed = fen.trim();
  const showPreview = fenTrimmed.length > 0 && valid;
  const showInvalidHint = fenTrimmed.length > 0 && !valid;

  return (
    <div className="space-y-2">
      <label htmlFor="attachmentFen" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.fen.input.label */}
        FEN position
      </label>
      <input
        id="attachmentFen"
        name="attachmentFen"
        type="text"
        maxLength={120}
        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        value={fen}
        onChange={(e) => onFenChange(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 font-mono text-sm text-foreground"
      />
      <label htmlFor="attachmentFenCaption" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.fen.input.captionLabel */}
        Caption (optional)
      </label>
      <input
        id="attachmentFenCaption"
        name="attachmentFenCaption"
        type="text"
        maxLength={200}
        placeholder=""
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground"
      />
      {showInvalidHint && (
        <p className="text-xs text-destructive">
          {/* TODO(i18n): attachment.fen.input.invalid (use existing postFenAttachment.error.invalidFenStructure copy) */}
          FEN format is invalid. Check the position, side to move, castling, and en passant fields.
        </p>
      )}
      {showPreview && (
        <div className="w-32 mx-auto sm:mx-0">
          <MiniBoard fen={fenTrimmed} responsive />
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
