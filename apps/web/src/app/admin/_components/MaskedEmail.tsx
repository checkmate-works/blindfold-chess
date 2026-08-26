'use client';

import { useCallback, useState } from 'react';

import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';

import { maskEmail } from '../_lib/mask-email';

type MaskedEmailProps = {
  email: string | null | undefined;
  labels: {
    revealEmail: string;
    hideEmail: string;
  };
  /** Rendered instead of the toggle when there is no address to show. */
  fallback?: string;
};

/**
 * An email address rendered masked, with a toggle that reveals it on demand.
 *
 * The threat this addresses is a bystander: an admin screen-sharing a user
 * list on a call, or someone glancing at the screen, walks away with real
 * addresses they never needed. Masking by default means the address is only
 * on screen when the admin deliberately asked for it.
 *
 * The full address is still sent to the browser — the toggle is client-side,
 * so it is in the RSC payload and readable from devtools. That is deliberate:
 * the page is admin-only, so the reader is already authorised to see the
 * address; it is the incidental audience we are protecting against, not the
 * admin. Do not reach for this component to withhold data from the person
 * operating the page.
 */
export function MaskedEmail({ email, labels, fallback = '-' }: MaskedEmailProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const toggle = useCallback(() => setIsRevealed((revealed) => !revealed), []);

  if (!email) return <span>{fallback}</span>;

  const label = isRevealed ? labels.hideEmail : labels.revealEmail;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{isRevealed ? email : maskEmail(email)}</span>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={isRevealed}
        title={label}
        className="inline-flex items-center justify-center p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {isRevealed ? (
          <FaRegEyeSlash className="h-3 w-3" aria-hidden="true" />
        ) : (
          <FaRegEye className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
