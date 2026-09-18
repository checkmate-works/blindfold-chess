import { z } from 'zod';

/**
 * The 254-character ceiling is the longest address an SMTP path may carry
 * (RFC 5321's 256-octet `Path` less the enclosing angle brackets), so an
 * address above it cannot be delivered no matter what the local syntax says.
 * Bounding the string before it reaches Supabase also keeps an arbitrarily
 * long body out of the auth call.
 */
const emailSchema = z.string().email().max(254);

/**
 * Whether a submitted address is worth sending to Supabase at all.
 *
 * Shared by sign-in and password reset, which had the same schema declared
 * as a local variable in each. Both treat a failure as an ordinary,
 * indistinguishable rejection rather than a field error: telling the caller
 * that the address was malformed, versus wrong or unknown, is the account
 * enumeration signal both actions are written to withhold.
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
