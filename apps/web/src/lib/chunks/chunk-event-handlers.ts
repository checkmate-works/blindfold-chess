import 'server-only';

import { notifyFollowersOfNewChunk } from '@/lib/notifications/notification';
import { logActivityEvent } from '@/lib/users/activity-log';

import type { ChunkEvent } from './chunk-events';

/**
 * Dispatch a `ChunkEvent` to its after-the-fact side effects: timeline
 * notifications and the activity-log audit row. Called by
 * `user-chunk-mutations` exactly once per mutation, *after* the
 * transaction commits.
 *
 * @design One handler, switched on kind
 * Switching here (instead of separate `onChunkCreated`,
 * `onChunkUpdated`, ... exports) keeps the dispatch surface narrow:
 * mutations only have to know `dispatchChunkEvent` exists, and adding a
 * new lifecycle transition is a single `case` branch with no
 * call-site changes anywhere else. The exhaustive switch / type guard
 * pair also forces the compiler to flag a missing branch when a new
 * event variant is added to `chunk-events.ts`.
 *
 * @design Fire-and-forget on notifications
 * `notifyFollowersOfNewChunk` is fire-and-forget by design (it fans out
 * to potentially many follower rows and we don't want the mutation
 * caller to await every recipient); the activity log is synchronous
 * because it costs ~one DB roundtrip.
 *
 * @design No `revalidatePath` — deliberate, do not re-add.
 * Every chunk route is dynamic, so there was no Full Route Cache to
 * evict; the calls that used to live here passed `/chunks` and
 * `/chunks/{slug}`, which could not even match the real
 * `/[locale]/chunks...` routes. All they achieved was forcing Next.js to
 * re-render and ship the caller's whole current page with the action
 * result. Each mutation's UI already refreshes itself: create / update
 * `router.push` to the chunk page, publish calls `router.refresh()`
 * (ChunkLifecycleControls) and delete `router.push`es to the list.
 * See the note on `performEntityToggleLike` in `@/lib/db/like-actions`.
 */
export function dispatchChunkEvent(event: ChunkEvent): void {
  switch (event.kind) {
    case 'created': {
      notifyFollowersOfNewChunk({
        actorId: event.actorId,
        chunkId: event.chunkId,
        slug: event.slug,
        kind: event.initialStatus === 'published' ? 'published' : 'created',
      });
      // No activity-log row: the chunks row itself is the durable record of
      // a creation, so logging here would only duplicate it.
      return;
    }
    case 'updated': {
      // A chunk edit overwrites title / description / fen / slug in place
      // with no revision history, so the activity log preserves the
      // overwritten values. Nothing changed → nothing worth logging.
      if (Object.keys(event.changes).length > 0) {
        logActivityEvent({
          userId: event.actorId,
          action: 'update_chunk',
          targetType: 'chunk',
          targetId: event.chunkId,
          metadata: { slug: event.slug, changes: event.changes },
        });
      }
      return;
    }
    case 'published': {
      notifyFollowersOfNewChunk({
        actorId: event.actorId,
        chunkId: event.chunkId,
        slug: event.slug,
        kind: 'published',
      });
      // No activity-log row: publishing is derivable from the chunks row
      // itself (`status='published'` + `publishedAt`).
      return;
    }
    case 'deleted': {
      // No activity-log row: deletion is a soft-delete, so the chunks row
      // (with `deletedAt`) survives as the durable record.
      return;
    }
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unhandled chunk event: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
