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
