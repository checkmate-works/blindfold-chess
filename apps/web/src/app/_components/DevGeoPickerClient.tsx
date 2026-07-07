'use client';

import { useEffect, useState } from 'react';

import { DEV_COUNTRY_COOKIE } from '@/lib/ads/country';

import { CountrySelect } from './CountrySelect';

/**
 * Client-side visual + behavior for {@link DevGeoPicker}.
 *
 * Reuses the app's searchable {@link CountrySelect} (same incremental-search
 * control as the profile and admin-ads forms) rather than a bespoke picker.
 * Because this widget is `position: fixed` in the bottom-left corner, the
 * select is told to open its list upward (`openUp`) so it does not clip below
 * the viewport.
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
      <CountrySelect
        value={country}
        onChange={apply}
        locale="en"
        openUp
        placeholder="Auto (Vercel geo)"
        searchPlaceholder="Search countries…"
        clearLabel="Reset to auto"
        noResults="No countries found"
      />
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Sets the <code>bfc_dev_country</code> cookie and reloads. Local dev only — ignored in
        production.
      </p>
    </div>
  );
}
