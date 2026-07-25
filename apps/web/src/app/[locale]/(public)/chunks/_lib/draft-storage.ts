import { validateFenStructure } from '@blindfold-chess/features/chess-core';

import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import {
  type ChunkFeedbackTopic,
  type ChunkStatus,
  isChunkFeedbackTopic,
  isChunkStatus,
} from '@/lib/chunks/validation';

/**
 * sessionStorage slot for handing the chunk authoring draft between
 * `/chunks/new` and `/chunks/new/preview`. Single slot per browser —
 * only one chunk is authored at a time on this device. Distinct from
 * the puzzle draft slot (`blindfold_chess_puzzle_draft`) so the two
 * flows never clobber each other.
 */
export const CHUNK_DRAFT_STORAGE_KEY = 'blindfold_chess_chunk_draft';

/**
 * Schema-versioned draft payload. `version: 1` is the only currently
 * recognized schema; `readChunkDraft` rejects any other version as
 * corrupt and clears the slot. Bumping the version is a deliberate
 * breaking change — in-flight drafts are sacrificed at upgrade time
 * since no server state has been persisted yet.
 *
 * `annotations` carries the same `BoardAnnotations` shape persisted by
 * the create / edit actions, so the preview client can render the
 * arrows + circles overlay without re-parsing.
 */
export type ChunkDraftV1 = {
  version: 1;
  representativeFen: string;
  title: string;
  slug: string;
  description: string;
  annotations: BoardAnnotations;
  /**
   * Lifecycle state the author intends on the next submit. Carried in
   * the draft so the preview's CTA can present "Publish chunk" vs
   * "Save as draft" without re-asking, and the create action gets the
   * resolved value straight from the preview.
   */
  status: ChunkStatus;
  /**
   * Fields the author wants targeted feedback on if the chunk is saved
   * as a draft. Persisted so the preview's submit handler can forward
   * the full payload to `createChunk` without re-asking. Always carried
   * in the draft (even when `status === 'published'`) so a user who
   * toggles the draft switch off and back on doesn't lose their ticks;
   * the mutation layer ignores the field outside the draft path.
   */
  feedbackTopics: ChunkFeedbackTopic[];
  /**
   * Present when the draft is an *edit* of an existing chunk rather than
   * a fresh create. Carries the row id and the slug the edit started
   * from so the preview can call `updateChunk` and resolve the
   * post-save target slug (draft chunks allow slug renames). Absent for
   * create drafts. Kept optional so create-side readers and older
   * bundles ignore it transparently.
   */
  edit?: {
    chunkId: string;
    initialSlug: string;
  };
  /** Tracks which editor tab was last active so re-entering /new restores it. */
  activeTab: 'board' | 'fen';
  /** White / black to move — encoded redundantly with the FEN for cheap reads. */
  sideToMove: 'w' | 'b';
  /** Board orientation flipped (black at the bottom). */
  flipped: boolean;
  /** Whether the orientation was changed by the user (suppresses auto-flip). */
  userFlipped: boolean;
};

function isAnnotation(value: unknown): value is BoardAnnotations {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.arrows) && Array.isArray(v.circles);
}

function isChunkDraftV1(value: unknown): value is ChunkDraftV1 {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.representativeFen !== 'string') return false;
  if (typeof v.title !== 'string') return false;
  if (typeof v.slug !== 'string') return false;
  if (typeof v.description !== 'string') return false;
  if (!isAnnotation(v.annotations)) return false;
  if (!isChunkStatus(v.status)) return false;
  // `feedbackTopics` was added after the initial v1 schema shipped, so
  // tolerate its absence on drafts written by older bundles instead of
  // discarding the whole draft — the author would lose typed-in text
  // for a feature that gracefully degrades to "no topics requested".
  if (v.feedbackTopics !== undefined) {
    if (!Array.isArray(v.feedbackTopics)) return false;
    if (!v.feedbackTopics.every(isChunkFeedbackTopic)) return false;
  }
  // `edit` was added after the initial v1 schema shipped and is absent
  // on create drafts, so tolerate its absence; validate the shape when
  // present.
  if (v.edit !== undefined) {
    if (v.edit === null || typeof v.edit !== 'object') return false;
    const e = v.edit as Record<string, unknown>;
    if (typeof e.chunkId !== 'string') return false;
    if (typeof e.initialSlug !== 'string') return false;
  }
  if (v.activeTab !== 'board' && v.activeTab !== 'fen') return false;
  if (v.sideToMove !== 'w' && v.sideToMove !== 'b') return false;
  if (typeof v.flipped !== 'boolean') return false;
  if (typeof v.userFlipped !== 'boolean') return false;
  return true;
}

/**
 * Read the authoring draft from sessionStorage. Returns `null` when:
 *   - sessionStorage is unavailable (private mode, iframe sandbox, SSR)
 *   - the slot is empty
 *   - the stored JSON fails to parse
 *   - the payload shape does not match `ChunkDraftV1`
 *   - the stored FEN fails `validateFenStructure`
 *
 * In every "corrupt payload" branch the slot is cleared so the user is
 * not stuck with a draft that can never hydrate. Unlike the puzzle
 * draft, we use `validateFenStructure` (chess.js-free) because chunks
 * are display-only piece patterns and a kingless pattern is a legitimate
 * payload.
 */
export function readChunkDraft(): ChunkDraftV1 | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return null;
  }
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(CHUNK_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearChunkDraft();
    return null;
  }

  if (!isChunkDraftV1(parsed)) {
    clearChunkDraft();
    return null;
  }

  if (!validateFenStructure(parsed.representativeFen).ok) {
    clearChunkDraft();
    return null;
  }

  // Backfill the post-v1.0 field so the rest of the codebase can rely
  // on `feedbackTopics` always being present without juggling
  // `undefined` everywhere.
  return { ...parsed, feedbackTopics: parsed.feedbackTopics ?? [] };
}

/**
 * Persist a draft. Returns `true` on success, `false` when sessionStorage
 * is unavailable or the write throws. Callers should surface an error
 * and NOT navigate to the preview page if this returns `false` — otherwise
 * the preview would immediately bounce back.
 */
export function writeChunkDraft(draft: ChunkDraftV1): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    sessionStorage.setItem(CHUNK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the draft slot. Safe to call even when no draft exists or
 * sessionStorage is unavailable — failures are swallowed.
 */
export function clearChunkDraft(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(CHUNK_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Default annotations to fall back to when constructing a fresh draft.
 * Kept here so callers don't import the editor's `EMPTY_BOARD_ANNOTATIONS`
 * just to seed the storage payload.
 */
export const EMPTY_CHUNK_ANNOTATIONS = EMPTY_BOARD_ANNOTATIONS;
