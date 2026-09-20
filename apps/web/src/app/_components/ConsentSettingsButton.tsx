'use client';

import { revokeConsent } from '@/lib/consent/consent-client';

type Props = {
  label: string;
  className?: string;
};

/**
 * The footer's way back to the consent banner: erases the stored decision so
 * the banner counts the visitor as unanswered again and re-appears.
 *
 * A button rather than a link, because there is no page to go to — the banner
 * is already in this document's HTML, waiting for `<html data-consent>` to
 * come off. It takes its label as a prop so the footer's server-side
 * translator stays the only thing reading the `consent` namespace.
 */
export function ConsentSettingsButton({ label, className }: Props) {
  return (
    <button type="button" onClick={revokeConsent} className={className}>
      {label}
    </button>
  );
}
