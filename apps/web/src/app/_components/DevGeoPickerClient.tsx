'use client';

import { useEffect, useMemo, useState } from 'react';

import { DEV_COUNTRY_COOKIE } from '@/lib/ads/country';
import { COUNTRY_CODES, countryCodeToFlag } from '@/lib/countries';

/**
 * Client-side visual + behavior for {@link DevGeoPicker}.
 *
 * A native `<select>` is used on purpose rather than the app's `CountrySelect`:
 * this widget is `position: fixed` in a screen corner, and `CountrySelect`'s
 * dropdown is hardcoded to open downward (`top-full`), so it would clip below
 * the viewport here. A native select is robust to placement, OS-keyboard
 * filterable, and entirely adequate for a developer tool.
 *
 * The current value is read from the cookie only after mount (never on the
 * server) to avoid a hydration mismatch — the collapsed label briefly shows
 * "AUTO" until the effect runs.
 */
export function DevGeoPickerClient() {
  const [expanded, setExpanded] = useState(false);
  const [country, setCountry] = useState('');

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${DEV_COUNTRY_COOKIE}=([^;]+)`));
    if (match) setCountry(decodeURIComponent(match[1]).toUpperCase());
  }, []);

  const options = useMemo(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({
      code,
      label: `${countryCodeToFlag(code)} ${names.of(code) ?? code} (${code})`,
    })).sort((a, b) => a.label.localeCompare(b.label, 'en'));
  }, []);

  const apply = (code: string) => {
    document.cookie = code
      ? `${DEV_COUNTRY_COOKIE}=${code}; path=/; SameSite=Lax; max-age=31536000`
      : `${DEV_COUNTRY_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
    // Reload so the SSR feed and the ad-slot fetch both re-resolve the geo.
    window.location.reload();
  };

  if (!expanded) {
    return (
      <button
        type="button"
        data-testid="dev-geo-picker-toggle"
        onClick={() => setExpanded(true)}
        title="Dev geo override (ad targeting)"
        className="fixed bottom-4 left-4 z-[60] flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-muted/50 print:hidden"
      >
        <span aria-hidden>🌍</span>
        <span>{country || 'AUTO'}</span>
      </button>
    );
  }

  return (
    <div
      data-testid="dev-geo-picker-panel"
      className="fixed bottom-4 left-4 z-[60] w-64 rounded-lg border border-border bg-card p-3 shadow-lg print:hidden"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">🌍 Dev geo override</span>
        <button
          type="button"
          aria-label="Collapse"
          onClick={() => setExpanded(false)}
          className="px-1 text-muted-foreground hover:text-foreground"
        >
          &times;
        </button>
      </div>
      <select
        value={country}
        onChange={(e) => apply(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Auto (Vercel geo)</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Sets the <code>bfc_dev_country</code> cookie and reloads. Local dev only — ignored in
        production.
      </p>
    </div>
  );
}
