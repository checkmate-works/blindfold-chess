'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { COUNTRY_CODES, countryCodeToFlag } from '@/lib/countries';

import { useDropdownClose } from '../_hooks/use-dropdown-close';

type Props = {
  value: string;
  onChange: (code: string) => void;
  locale: string;
  placeholder?: string;
  searchPlaceholder?: string;
  clearLabel?: string;
  noResults?: string;
};

export function CountrySelect({
  value,
  onChange,
  locale,
  placeholder,
  searchPlaceholder,
  clearLabel,
  noResults,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);

  const countries = useMemo(() => {
    return COUNTRY_CODES.map((code) => ({
      code,
      name: displayNames.of(code) ?? code,
      flag: countryCodeToFlag(code),
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [displayNames, locale]);

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const lower = search.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(lower) || c.code.toLowerCase().includes(lower)
    );
  }, [countries, search]);

  useDropdownClose(containerRef, isOpen, setIsOpen);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  const selectedCountry = value ? countries.find((c) => c.code === value.toUpperCase()) : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors hover:bg-muted/50"
        >
          <span className={selectedCountry ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : placeholder}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={clearLabel}
          >
            &times;
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{noResults}</div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors duration-150 focus:outline-none focus:bg-muted ${
                    value.toUpperCase() === country.code ? 'bg-muted/50' : ''
                  }`}
                >
                  {country.flag} {country.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
