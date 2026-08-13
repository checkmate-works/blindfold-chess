/**
 * Max accepted length for FEN input — must remain in lock-step with the
 * DB CHECK constraint and Server Action pre-checks. Lessons §10
 * (validator / DB CHECK length canonicalization).
 *
 * Mirrors the `post_fen_attachments.fen` column width. Imported by the
 * Server Actions (`attachPostFen`, `createChunkPostWithFenAttachment`) and
 * by the FEN sub-input UI (`MediaAttachmentInput`) so a future column-width
 * change cannot drift across layers.
 */
export const FEN_MAX_LENGTH = 100;

/**
 * Maximum length of a stored FEN caption.
 *
 * Mirrors the `post_fen_attachments.caption` column width, and is read twice
 * for two different jobs: `buildFenAttachmentValues` rejects anything longer
 * so the author gets a structured error, and `sanitizeFenCaption` slices to it
 * as a last resort. Those two lived beside their own copies of the number,
 * each with a comment saying it was aligned with the other — and the failure
 * mode is asymmetric: widen the column and the pre-check only, and the
 * sanitizer silently truncates the extra characters, which is exactly what
 * the pre-check exists to prevent.
 */
export const FEN_CAPTION_MAX_LENGTH = 200;
