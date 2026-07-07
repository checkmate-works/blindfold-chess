/**
 * Re-export from @blindfold-chess/types for backward compatibility.
 * The canonical source is now in packages/types.
 */
import { COUNTRY_CODES } from '@blindfold-chess/types';

export { COUNTRY_CODES, countryCodeToFlag } from '@blindfold-chess/types';

/** True when `code` is a real ISO 3166-1 alpha-2 country code. */
export function isValidCountryCode(code: string): boolean {
  return COUNTRY_CODES.includes(code);
}
