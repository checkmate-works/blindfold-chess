'use client';

type Props = {
  idleLabel: string;
  busyLabel: string;
  busy: boolean;
  onFile: (file: File) => void;
  /** Forwarded to the hidden input so a `Field`'s `htmlFor` can point at it. */
  inputId?: string;
  className?: string;
};

/**
 * Button-styled file picker for the creative image uploads (avatar and
 * thumbnail override). Accepts the same formats the upload API validates and
 * resets the input after each pick so re-selecting the same file re-fires
 * `onFile`.
 */
export function ImageFileButton({ idleLabel, busyLabel, busy, onFile, inputId, className }: Props) {
  return (
    <label
      className={`cursor-pointer px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary transition-colors${className ? ` ${className}` : ''}`}
    >
      {busy ? busyLabel : idleLabel}
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // eslint-disable-next-line no-param-reassign -- standard DOM idiom: clearing the file input so re-selecting the same file re-fires change
          e.target.value = '';
        }}
      />
    </label>
  );
}
