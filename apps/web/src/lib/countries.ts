/**
 * Re-export from @blindfold-chess/types for backward compatibility.
 * The canonical source is now in packages/types.
 */
import { COUNTRY_CODES } from '@blindfold-chess/types';

export { COUNTRY_CODES, countryCodeToFlag } from '@blindfold-chess/types';

/**
 * True when `code` is a real ISO 3166-1 alpha-2 country code.
 *
 * Case-sensitive on purpose: callers normalize to uppercase before storing
 * (the ad forms' `parseCountry`, profile validation), so a lowercase value
 * reaching this check is malformed input and must fail — accepting it here
 * would let a non-canonical code into the DB, where country matching
 * compares `===` against the uppercase geo header.
 */
export function isValidCountryCode(code: string): boolean {
  return COUNTRY_CODES.includes(code);
}
