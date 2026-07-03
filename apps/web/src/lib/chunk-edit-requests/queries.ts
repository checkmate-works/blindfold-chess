import { chunkEditRequests } from '@/lib/db';
import { makeEditRequestQueries } from '@/lib/edit-requests/queries-factory';

const queries = makeEditRequestQueries({
  table: chunkEditRequests,
  parentIdColumn: chunkEditRequests.chunkId,
});

/** See {@link makeEditRequestQueries} for the shared read-side semantics. */
export const listEditRequestsForChunk = queries.listForParent;
export const countPendingEditRequestsForChunk = queries.countPendingForParent;
export const getEditRequestById = queries.getById;
export const getViewerPendingEditRequestForChunk = queries.getViewerPendingForParent;
