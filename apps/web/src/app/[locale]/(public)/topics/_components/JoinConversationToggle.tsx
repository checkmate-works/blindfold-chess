'use client';

import { type ReactNode, useState } from 'react';

import { FaRegComment } from 'react-icons/fa';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

type Props = {
  /** Number of comments / replies. Rendered as a bare numeral next to
   * the comment icon — the icon disambiguates the unit, so the noun
   * is intentionally suppressed (was previously e.g. "5 comments").
   * This collapses one i18n string per locale into a single number
   * across every callsite. */
  count: number;
  /** Label shown on the trigger button (e.g. "Join the conversation"). */
  joinLabel: string;
  /**
   * Leading icon that disambiguates the bare count. Defaults to the comment
   * glyph; pass another (e.g. a chunk icon) to reuse this CTA for a different
   * contribution kind.
   */
  icon?: ReactNode;
  /**
   * New-post form mounted once the trigger is clicked. Optional when
   * {@link onActivate} is set. Pass a function to receive `close`, which
   * collapses back to the trigger — call it once the form's work is done (a
   * successful post), so a finished composer stops occupying the viewport.
   */
  children?: ReactNode | ((api: { close: () => void }) => ReactNode);
  /**
   * When provided, an authenticated click runs this instead of expanding the
   * inline composer — used where there is nothing to expand yet (e.g. a
   * not-yet-shared game, which must be published before it can be discussed).
   * The anonymous → sign-up-modal guard is unchanged, so this still yields the
   * "sign in when signed out, do X when signed in" state branch.
   */
  onActivate?: () => void;
};

/**
 * Reddit-style collapsed CTA that promotes commenting without taking up
 * vertical space when the reader has not opted in. The form is intentionally
 * unmounted in the collapsed state — this keeps the textarea / submit button
 * out of the focus order until the user signals intent. There is no *manual*
 * collapse affordance while expanded: the form stays mounted so half-typed
 * input is never lost to a stray tap, mirroring Reddit's pattern.
 *
 * The form itself may still collapse the toggle once it has nothing left to
 * hold — see the `close` handed to a render-prop child. A posted comment
 * leaves an empty textarea that, on a phone, pushes the thread it was meant
 * to join off screen; the inline reply form (`GameCommentNode`) already
 * closes itself on success for the same reason.
 *
 * Anonymous clicks are routed through `useAuthGuard` so signed-out readers
 * see the shared `AuthPromptModal` (sign in / sign up CTA) instead of being
 * silently expanded into a form they cannot submit. This unifies the
 * "promote sign-up" behavior with the LikeButton.
 */
export function JoinConversationToggle({
  count,
  joinLabel,
  icon = <FaRegComment aria-hidden="true" className="text-muted-foreground" />,
  children,
  onActivate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  if (isOpen) {
    return (
      <>{typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}</>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => guardAction(onActivate ?? (() => setIsOpen(true)))}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        {icon}
        <span className="text-muted-foreground">{count.toLocaleString()}</span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>{joinLabel}</span>
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
