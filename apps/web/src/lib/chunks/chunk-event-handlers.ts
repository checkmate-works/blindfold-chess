import { revalidatePath } from 'next/cache';

import 'server-only';

import { notifyFollowersOfNewChunk } from '@/lib/notifications/notification';
import { logActivityEvent } from '@/lib/users/activity-log';

import type { ChunkEvent } from './chunk-events';

/**
 * Dispatch a `ChunkEvent` to every after-the-fact side effect: timeline
 * notifications, the activity-log audit row, and Next.js path
 * revalidation. Called by `user-chunk-mutations` exactly once per
 * mutation, *after* the transaction commits.
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
 * caller to await every recipient); the activity log and revalidate
 * calls are synchronous because they cost ~one DB roundtrip and one
 * cache-eviction call respectively.
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
      logActivityEvent({
        userId: event.actorId,
        action: 'create_chunk',
        targetType: 'chunk',
        targetId: event.chunkId,
        metadata: { slug: event.slug },
      });
      revalidatePath('/chunks');
      revalidatePath(`/chunks/${event.slug}`);
      return;
    }
    case 'updated': {
      logActivityEvent({
        userId: event.actorId,
        action: 'update_chunk',
        targetType: 'chunk',
        targetId: event.chunkId,
        metadata: event.previousSlug
          ? { slug: event.slug, previousSlug: event.previousSlug }
          : { slug: event.slug },
      });
      revalidatePath('/chunks');
      revalidatePath(`/chunks/${event.previousSlug ?? event.slug}`);
      // Revalidate the new URL too — without this the freshly-renamed
      // chunk's page would render a stale-cached 404 for the next
      // viewer who follows the new slug.
      if (event.previousSlug && event.previousSlug !== event.slug) {
        revalidatePath(`/chunks/${event.slug}`);
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
      logActivityEvent({
        userId: event.actorId,
        action: 'publish_chunk',
        targetType: 'chunk',
        targetId: event.chunkId,
        metadata: { slug: event.slug, from: event.from, to: 'published' },
      });
      revalidatePath('/chunks');
      revalidatePath(`/chunks/${event.slug}`);
      return;
    }
    case 'deleted': {
      logActivityEvent({
        userId: event.actorId,
        action: 'delete_chunk',
        targetType: 'chunk',
        targetId: event.chunkId,
        metadata: { slug: event.slug, title: event.title },
      });
      revalidatePath('/chunks');
      revalidatePath(`/chunks/${event.slug}`);
      return;
    }
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unhandled chunk event: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
