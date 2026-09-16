import { JOIN_CONVERSATION_TOGGLE_CHROME } from '@/app/[locale]/(public)/topics/_lib/skeleton-layout-classes';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Placeholder for the slot between the replies heading and the first reply
 * card, where the rendered page puts whichever answer applies to "can I join
 * this thread?" — the collapsed `JoinConversationToggle`, or a one-line notice
 * when the author's reply permission blocks this reader.
 *
 * The slot is never empty on a post that has replies, so a skeleton that
 * reserved nothing for it made the whole run of reply cards jump up by the
 * CTA's height at the hand-off from `loading.tsx` to the real page. Sizing
 * comes from {@link JOIN_CONVERSATION_TOGGLE_CHROME}, shared with the button
 * itself, so the reservation tracks any change to its padding or text size.
 *
 * The inner bar is `h-5` to match the `text-sm` line box the real button's
 * icon and labels sit in; the chrome's padding and border supply the rest of
 * the height, exactly as they do for the button.
 */
export function ReplyAffordanceSkeleton() {
  return (
    <div className={JOIN_CONVERSATION_TOGGLE_CHROME}>
      <Skeleton className="h-5 w-48 rounded" />
    </div>
  );
}
