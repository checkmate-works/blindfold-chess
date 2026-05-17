import { MIN_PASSWORD_LENGTH } from '@/config';
import { z } from 'zod';

// Keep in sync with Supabase password_requirements in supabase/config.toml
// Production: also update in Supabase Dashboard > Authentication > Settings > Password
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'tooShort')
  .regex(/[a-zA-Z]/, 'missingLetter') // letters_digits: requires at least one letter
  .regex(/\d/, 'missingDigit'); // letters_digits: requires at least one digit

const PASSWORD_VALIDATION_ERROR_KEYS = [
  'tooShort',
  'missingLetter',
  'missingDigit',
  'weak', // Supabase-side rejection (e.g. HIBP, or requirements stricter than local schema)
] as const;

export type PasswordValidationErrorKey = (typeof PASSWORD_VALIDATION_ERROR_KEYS)[number];

export function isPasswordValidationErrorKey(key: string): key is PasswordValidationErrorKey {
  return (PASSWORD_VALIDATION_ERROR_KEYS as readonly string[]).includes(key);
}

export function getPasswordValidationError(password: string): PasswordValidationErrorKey | null {
  const result = passwordSchema.safeParse(password);
  if (result.success) return null;
  const message = result.error.issues[0].message;
  return isPasswordValidationErrorKey(message) ? message : 'weak';
}

/**
 * Extract the password-policy error key from a server-action error.
 *
 * Server actions report password-policy failures as `password:<key>`.
 * Returns the `<key>` when `serverError` carries that prefix and the key is
 * a known validation key; returns `null` otherwise (not a password error,
 * or an unrecognized key) so the caller can fall back to a generic message.
 */
export function parsePasswordServerError(serverError: string): PasswordValidationErrorKey | null {
  const prefix = 'password:';
  if (!serverError.startsWith(prefix)) return null;
  const key = serverError.slice(prefix.length);
  return isPasswordValidationErrorKey(key) ? key : null;
}
