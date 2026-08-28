import Link from 'next/link';

import { countryName } from '@/app/admin/_lib/country-name';

import { countryCodeToFlag, isValidCountryCode } from '@/lib/countries';

import { type AdminUserFilters, buildAdminUsersHref } from '../_lib/filters';

type Props = {
  /** ISO 3166-1 alpha-2 code from `profiles.country`. */
  code: string;
  /** Filters currently applied to the list — preserved when narrowing by country. */
  filters: AdminUserFilters;
  /** Accessible-name prefix, e.g. "Filter by country". */
  label: string;
};

/**
 * The flag of a user's country, linking to the same list narrowed to that
 * country — the row-level counterpart of clicking a bar in the country chart.
 *
 * A Server Component on purpose: the users list renders up to a full page of
 * rows, and a hover title is enough to disambiguate a flag on a desktop-only
 * admin screen, so this stays out of the client bundle. (The public profile's
 * `CountryFlag` is a tap-to-reveal client component instead because it is read
 * mostly on touch devices, where `title` never shows.)
 *
 * Renders nothing for a code outside ISO 3166-1 alpha-2: `countryCodeToFlag`
 * maps any two characters to regional-indicator symbols, so a malformed value
 * would surface as mojibake rather than as the missing data it is.
 */
export function CountryFilterFlag({ code, filters, label }: Props) {
  if (!isValidCountryCode(code)) return null;

  const name = countryName(code);
  const flag = countryCodeToFlag(code);

  // Already narrowed to this country — the link would be a no-op, so drop the
  // affordance and keep the flag as plain information.
  if (filters.countryFilter === code) {
    return (
      <span title={name} aria-label={name} className="ml-2 leading-none">
        {flag}
      </span>
    );
  }

  return (
    <Link
      href={buildAdminUsersHref({ ...filters, countryFilter: code }, 1)}
      title={name}
      aria-label={`${label}: ${name}`}
      className="ml-2 leading-none hover:opacity-70"
    >
      {flag}
    </Link>
  );
}
