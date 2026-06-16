import type { AggregatedAttachmentMode } from '../_components/AttachmentModal';

export type ApplyAttachmentResult =
  | { ok: true; kind: 'pgn' | 'fen' | 'empty' | 'image' }
  | { ok: false; reason: 'invalid_fen' };

/**
 * Serialise an `AggregatedAttachmentMode` (the value `AttachmentModal`
 * emits on apply) onto a FormData using the field names every
 * attachment-aware Server Action reads:
 *
 *   - PGN: `attachment` (the raw paste — Lichess URL / chess.com URL /
 *     PGN body) plus optional `attachmentAnonymize=on`. The Server Action
 *     re-runs `detectAttachmentInput` to dispatch into the right pipeline.
 *   - FEN: `attachmentFen` and optional `attachmentFenCaption`.
 *   - empty: no fields touched. The caller's dispatch logic decides
 *     whether an empty submit still hits a default-pgn action (create
 *     flow) or simply closes the modal (edit flow).
 *
 * The helper rejects an invalid-FEN mode without mutating `formData` so
 * the caller can surface a structured error without first cleaning up
 * partial writes. Both `BasePostForm` (create flow) and
 * `EditableAttachments` (edit flow) share this contract verbatim;
 * extracting it keeps the two from drifting on field names or empty-
 * mode semantics.
 */
export function applyAttachmentMode(
  mode: AggregatedAttachmentMode,
  formData: FormData
): ApplyAttachmentResult {
  switch (mode.kind) {
    case 'empty':
      return { ok: true, kind: 'empty' };
    case 'pgn':
      formData.set('attachment', mode.pgn);
      if (mode.anonymize) formData.set('attachmentAnonymize', 'on');
      return { ok: true, kind: 'pgn' };
    case 'fen':
      if (!mode.valid) return { ok: false, reason: 'invalid_fen' };
      formData.set('attachmentFen', mode.fen);
      if (mode.caption !== null) formData.set('attachmentFenCaption', mode.caption);
      return { ok: true, kind: 'fen' };
    case 'image':
      // Images are NOT serialised onto FormData here — they are uploaded
      // out-of-band to `/api/posts/[id]/images` after the post exists
      // (2-step flow). Callers branch on `image` before reaching this
      // helper; this arm only keeps the switch exhaustive.
      return { ok: true, kind: 'image' };
    default: {
      const _exhaustive: never = mode;
      void _exhaustive;
      return { ok: true, kind: 'empty' };
    }
  }
}
