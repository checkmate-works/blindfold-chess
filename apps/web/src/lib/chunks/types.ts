import type { AuthorProfile } from '@/lib/users/author-profile';

import type { ChunkStatus } from './validation';

/**
 * UI-facing chunk shape used by the puzzle tag picker and detail modal.
 * `label` mirrors `chunks.title` (chunks are not yet localized); having
 * the field named `label` keeps the picker's contract symmetric with
 * `ThemeOption.label`, where the value IS locale-resolved.
 *
 * Distinct from the row shape returned by `getLinkedChunksForPosition`,
 * which preserves the raw `title` column for read-side consumers
 * (detail pages, RelatedTags) that don't go through the picker
 * abstraction.
 */
export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
  representativeFen: string;
  description: string | null;
  /**
   * Lifecycle state of the underlying chunk. Carried so pickers that
   * surface draft rows — the game-move picker, which offers the viewer's
   * own drafts (see `getLinkableChunkOptionsForViewer`), and the
   * already-attached list, which never filtered on status — can mark them
   * as unsettled. Published-only catalogs always report `'published'`.
   */
  status: ChunkStatus;
};

/**
 * The shape a "chunk linked to a position" list item needs to render as a
 * `ChunkLinkCard` — shared by `GameChunkItem` (`db/game-chunks.ts`, keyed by
 * `gameId` + `ply`) and `RepertoireChunkItem` (`db/repertoire-chunks.ts`,
 * keyed by `repertoireId` + `positionKey`). The card itself only ever reads
 * these fields, so it is written against this structural type rather than
 * either concrete item — letting both features share one card without a
 * union or a game/repertoire branch inside it.
 */
export type ChunkLinkCardItem = {
  id: string;
  chunkId: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  status: ChunkStatus;
  createdAt: Date;
  suggestedById: string | null;
  suggester: AuthorProfile | null;
};
