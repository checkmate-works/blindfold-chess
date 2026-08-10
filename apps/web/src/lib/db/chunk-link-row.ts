/**
 * The half of a chunk-link read that does not depend on what the chunk is
 * linked to.
 *
 * @description
 * `game_chunks` anchors a link to a move (`ply`); `repertoire_chunks` anchors
 * it to a position (`position_key`). Everything else about the two reads is
 * the same query and the same row-to-domain mapping: the columns pulled off
 * `chunks`, the suggester's joined profile, the fallback for an unrecognized
 * lifecycle value, and the null-suggester case for a hard-deleted account.
 *
 * That shared half lives here so the two stay one rule. The anchor column,
 * the `from` / `where` / `orderBy`, and the link table itself stay with each
 * caller — those are what actually differ.
 */
import { type ChunkStatus, isChunkStatus } from '@/lib/chunks/validation';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { chunks, profiles } from './schema';

/**
 * Columns to spread into a chunk-link `select()`, alongside the link table's
 * own `id` / `chunkId` / `createdAt` / `suggestedById` and its anchor.
 *
 * Pair with `.innerJoin(chunks, …)` and
 * `.leftJoin(profiles, liveProfileJoinOn(<table>.suggestedById))` — left, so a
 * link whose suggester deleted their account still surfaces.
 */
export const CHUNK_LINK_COLUMNS = {
  slug: chunks.slug,
  title: chunks.title,
  description: chunks.description,
  representativeFen: chunks.representativeFen,
  status: chunks.status,
  suggesterUsername: profiles.username,
  suggesterDisplayName: profiles.displayName,
  suggesterAvatarUrl: profiles.avatarUrl,
};

/** The raw row `CHUNK_LINK_COLUMNS` plus the link table's own columns produce. */
export type ChunkLinkRow = {
  id: string;
  chunkId: string;
  createdAt: Date;
  suggestedById: string | null;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  status: string;
  suggesterUsername: string | null;
  suggesterDisplayName: string | null;
  suggesterAvatarUrl: string | null;
};

/** A chunk link with its chunk and suggester resolved, minus the anchor. */
export type ChunkLink = {
  id: string;
  chunkId: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  /**
   * Lifecycle state of the linked chunk. A link may point at a draft (the
   * author's own — see `linkableChunkPredicate`), whose title is still open to
   * renegotiation, so the UI marks those rows rather than letting them read as
   * settled catalog entries.
   */
  status: ChunkStatus;
  createdAt: Date;
  suggestedById: string | null;
  /** Null when the suggester's account was hard-deleted. */
  suggester: AuthorProfile | null;
};

/** Turn a joined chunk-link row into its domain shape. */
export function mapChunkLinkRow(row: ChunkLinkRow): ChunkLink {
  return {
    id: row.id,
    chunkId: row.chunkId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    representativeFen: row.representativeFen,
    // Unknown values fall back to 'published' — an unrecognized lifecycle
    // state must not render as "still being workshopped".
    status: isChunkStatus(row.status) ? row.status : 'published',
    createdAt: row.createdAt,
    suggestedById: row.suggestedById,
    suggester: row.suggesterUsername
      ? {
          username: row.suggesterUsername,
          displayName: row.suggesterDisplayName,
          avatarUrl: row.suggesterAvatarUrl,
        }
      : null,
  };
}
