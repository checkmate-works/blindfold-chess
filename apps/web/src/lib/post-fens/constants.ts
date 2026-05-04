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
