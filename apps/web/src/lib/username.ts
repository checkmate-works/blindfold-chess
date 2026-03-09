/**
 * Username validation rules:
 * - Length: 2-20 characters
 * - Allowed characters: lowercase letters a-z, digits 0-9, underscore _
 * - Must start with a lowercase letter
 * - Must end with a lowercase letter or digit
 * - No consecutive underscores
 * - No uppercase, no hyphens
 */
import { isReservedUsername } from '@/lib/reserved-usernames';

const USERNAME_REGEX = /^[a-z](?:[a-z0-9]_?)*[a-z0-9]$/;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 20;

export type UsernameValidationError = 'too_short' | 'too_long' | 'invalid_format' | 'reserved';

export function validateUsername(username: string): UsernameValidationError | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return 'too_short';
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return 'too_long';
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'invalid_format';
  }
  if (isReservedUsername(username)) {
    return 'reserved';
  }
  return null;
}
