'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (square: string) => void;
  availableMoves: string[];
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
};

export function SquareInput({
  value,
  onChange,
  onSubmit,
  availableMoves,
  disabled = false,
  placeholder,
  showSuggestions = true,
}: Props) {
  const t = useTranslations('practice.knightTour');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!value.trim() || !showSuggestions) return [];
    const input = value.toLowerCase();
    return availableMoves.filter((move) => move.toLowerCase().startsWith(input));
  }, [value, availableMoves, showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (trimmed) {
      // Always call onSubmit - let parent handle validation
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      onChange(suggestions[0]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion);
    onChange('');
  };

  const displaySuggestions = showSuggestions && isFocused && suggestions.length > 0;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            disabled={disabled}
            placeholder={placeholder || t('inputSquare')}
            className="w-full px-4 py-3 border border-border rounded-md bg-background font-mono text-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Suggestions Dropdown */}
          {displaySuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-4 py-2 text-left font-mono text-sm text-foreground hover:bg-muted transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-muted"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="w-14 h-14 bg-muted hover:bg-foreground hover:text-background disabled:bg-muted disabled:cursor-not-allowed text-foreground font-medium rounded-md transition-all duration-150 flex items-center justify-center text-xl border border-border"
          title={t('submitMove')}
        >
          ♞
        </button>
      </form>
    </div>
  );
}
