'use client';

import { type ReactNode, useState } from 'react';

import { FaRegComment } from 'react-icons/fa';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

type Props = {
  /** Pre-formatted comment count (e.g. "5 comments") — locale plural already applied. */
  countText: string;
  /** Label shown on the trigger button (e.g. "Join the conversation"). */
  joinLabel: string;
  /** New-post form mounted once the trigger is clicked. */
  children: ReactNode;
};

/**
 * Reddit-style collapsed CTA that promotes commenting without taking up
 * vertical space when the reader has not opted in. The form is intentionally
 * unmounted in the collapsed state — this keeps the textarea / submit button
 * out of the focus order until the user signals intent. Once expanded, there
 * is no collapse affordance: the form stays mounted so half-typed input is
 * preserved across re-renders, mirroring Reddit's pattern.
 *
 * Anonymous clicks are routed through `useAuthGuard` so signed-out readers
 * see the shared `AuthPromptModal` (sign in / sign up CTA) instead of being
 * silently expanded into a form they cannot submit. This unifies the
 * "promote sign-up" behavior with the LikeButton.
 */
export function JoinConversationToggle({ countText, joinLabel, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  if (isOpen) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => guardAction(() => setIsOpen(true))}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <FaRegComment aria-hidden="true" className="text-muted-foreground" />
        <span className="text-muted-foreground">{countText}</span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>{joinLabel}</span>
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
