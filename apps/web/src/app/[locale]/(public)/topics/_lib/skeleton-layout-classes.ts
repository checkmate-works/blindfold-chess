/**
 * Layout class strings shared between the topic post-detail UI and its
 * route-segment loading skeletons. Defined here as constants — not as a
 * component — so the skeleton cannot drift out of sync with the real layout
 * while imports stay tree-shakable. Each constant names the real call site
 * that owns the design; change the constant and both sides move together.
 */

/**
 * Box metrics for the collapsed "join the conversation" CTA, whose design is
 * owned by `JoinConversationToggle`. The real button layers its colours and
 * interactivity (`text-foreground`, `hover:`, `focus-visible:`, `cursor-`)
 * on top; only the sizing box is shared, which is all a placeholder needs.
 *
 * The post-detail `loading.tsx` files reserve this height because the slot
 * between the replies heading and the first reply card is never empty in the
 * rendered page: a reader who may reply gets this CTA, and one blocked by the
 * author's reply permission gets a one-line notice in its place. Reserving
 * nothing there dropped the whole run of reply cards by the CTA's height the
 * moment the skeleton was replaced.
 *
 * It lives here rather than beside the toggle because `loading.tsx` is a
 * Server Component and `JoinConversationToggle` is a client module — a class
 * string imported across that boundary is not reliably a string in the RSC
 * pass. This mirrors `MOVE_NAV_ROW_CLASS` in the games/play equivalent, and
 * the same rule applies: anything that can render the real control should.
 */
export const JOIN_CONVERSATION_TOGGLE_CHROME =
  'flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium';
