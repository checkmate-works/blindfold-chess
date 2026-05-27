import { isChunkStatus } from '@/lib/chunks/validation';

/**
 * Viewer's relationship to the edit-suggestion flow on a draft chunk.
 * Determines which CTA copy the callout shows. Kept as a flat string
 * union (rather than a `'owner' | { type: 'pending', id: string }` shape)
 * because every consumer just looks up a copy variant by tag — there is
 * no behaviour difference between "has pending" and "could suggest"
 * beyond which sentence renders.
 */
export type EditRequestCalloutViewerState = 'owner' | 'hasPending' | 'canSuggest' | 'signedOut';

/**
 * Pure derivation of the display-state flags the chunk detail page
 * branches on. Lifted out of the page module so the page can stay a
 * data-load + JSX-composition module — and so a test that wants to
 * exercise the "owner viewing empty queue suppresses callout" rule
 * doesn't have to spin up the whole Next.js page transition.
 *
 * Inputs are the minimal surface the rules read; outputs are the small
 * set of booleans / tags the JSX consumes directly. No translations and
 * no Next.js machinery enter this module — that keeps it cheap to test
 * and easy to extend with more rules (e.g. a future "soft-deleted"
 * state) without touching the data layer.
 */
export function resolveChunkDisplayState(input: {
  chunkStatus: string;
  /**
   * The chunk row's `userId`. Nullable at the DB layer because pre-UGC
   * legacy rows have NULL — those rows can have no owner and the
   * "isOwner" derivation always returns `false`.
   */
  chunkUserId: string | null;
  viewerUserId: string | undefined;
  viewerHasPendingEditRequest: boolean;
  pendingEditRequestCount: number;
}): {
  status: 'draft' | 'published';
  isDraft: boolean;
  isOwner: boolean;
  calloutViewerState: EditRequestCalloutViewerState;
  /**
   * Render the edit-suggestion callout. Owner-side, an empty queue
   * carries no action and no information the Draft badge isn't already
   * conveying — suppress the callout rather than render a "No
   * suggestions yet" line that adds visual noise to every page the
   * author opens on their own drafts. Non-owners always see the
   * callout when the chunk is in draft because it carries their entry
   * point into the suggestion flow.
   */
  showEditRequestCallout: boolean;
} {
  // The DB stores `status` as a varchar; an unknown value (e.g. a future
  // state shipped before this page was redeployed) degrades to
  // 'published' so the page still renders the safe defaults instead of
  // crashing.
  const status = isChunkStatus(input.chunkStatus) ? input.chunkStatus : 'published';
  const isDraft = status === 'draft';
  const isOwner =
    !!input.viewerUserId && !!input.chunkUserId && input.viewerUserId === input.chunkUserId;

  const calloutViewerState: EditRequestCalloutViewerState = !input.viewerUserId
    ? 'signedOut'
    : isOwner
      ? 'owner'
      : input.viewerHasPendingEditRequest
        ? 'hasPending'
        : 'canSuggest';

  const showEditRequestCallout =
    isDraft && !(calloutViewerState === 'owner' && input.pendingEditRequestCount === 0);

  return { status, isDraft, isOwner, calloutViewerState, showEditRequestCallout };
}
