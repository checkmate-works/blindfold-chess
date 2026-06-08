'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { countryCodeToFlag } from '@/lib/countries';

type Props = {
  /** ISO 3166-1 alpha-2 country code (e.g. "JP"). */
  code: string;
  /** Active locale — the country name is localized to this locale. */
  locale: string;
  /** Applied to the outer wrapper (e.g. margin utilities). */
  className?: string;
};

/**
 * A country flag emoji that reveals the localized country name on tap / click.
 *
 * The flag emoji alone is ambiguous (many users can't map 🇸🇮 → Slovenia), so
 * the name is surfaced on demand. We deliberately use tap-to-toggle rather than
 * the native `title` attribute: `title` only shows on desktop hover and is
 * invisible on touch devices, where most profile views happen. The popover is
 * dismissed by an outside tap or the Escape key.
 *
 * The country name is resolved with `Intl.DisplayNames` so it is automatically
 * localized to the viewer's locale, with the raw code as a fallback for unknown
 * regions.
 */
export function CountryFlag({ code, locale, className }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const countryName = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  }, [code, locale]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={countryName}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className="cursor-pointer leading-none"
      >
        {countryCodeToFlag(code)}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-normal text-foreground shadow-md"
        >
          {countryName}
        </span>
      )}
    </span>
  );
}
