/** Placeholder substituted for the hidden part of an address. */
const MASK = '***';

/**
 * Hide the local part of an email address, keeping the domain intact.
 *
 * `k_okishima@fuji.enterprises` becomes `k***@fuji.enterprises`. The first
 * character survives so that two rows belonging to different people stay
 * visually distinct, and the domain survives so an admin can still tell a
 * throwaway mailbox from a corporate one without revealing the address.
 *
 * Anything that does not parse as `local@domain` — no `@`, or an empty local
 * part — is replaced wholesale, because there is no part we can prove is safe
 * to show.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return MASK;

  return `${email[0]}${MASK}${email.slice(at)}`;
}
