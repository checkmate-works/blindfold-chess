import { DevGeoPickerClient } from './DevGeoPickerClient';

/**
 * A local-development-only floating control for forcing the ad-targeting geo,
 * so country-targeted creatives are testable without Vercel's
 * `x-vercel-ip-country` header (which never exists off-platform).
 *
 * It writes the `bfc_dev_country` cookie that `getRequestCountry`
 * (`@/lib/ads/country`) reads as a dev-only fallback; changing it reloads the
 * page so both the SSR feed path and the `/api/ad-slot/[slot]` fetch re-resolve
 * to the chosen country.
 *
 * Gating mirrors the intent of `EnvironmentRibbon`, but is deliberately
 * stricter: it renders ONLY when `NODE_ENV === 'development'`. That is exactly
 * the set of environments where the server-side override is honored —
 * `getRequestCountry` compiles the cookie fallback out when
 * `NODE_ENV === 'production'`, and Vercel *preview* builds run with
 * `NODE_ENV === 'production'` (and carry a real geo header anyway), so showing
 * the picker there would be a dead control. `NODE_ENV === 'test'` is likewise
 * excluded to avoid interfering with Playwright/E2E runs.
 *
 * Placed under `src/app/_components/` (not `[locale]/_components/`) for the
 * same reason as `EnvironmentRibbon`: the app has multiple root layouts, and
 * this location is reachable from each. It is mounted only on the ad-bearing
 * surfaces (`[locale]` and `(landing)`), not on `admin`, where no ads render
 * and the control would have no locally visible effect.
 */
export function DevGeoPicker() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevGeoPickerClient />;
}
