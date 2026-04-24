'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaCheck } from 'react-icons/fa';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

import { useMoveSuggestions } from '../_hooks';

// --- SuggestionInput Component ---

type SuggestionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, usedAutocomplete?: boolean) => void;
  suggestions: string[];
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
  showSubmitButton?: boolean;
  className?: string;
};

function SuggestionInput({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  disabled = false,
  placeholder,
  showSuggestions = true,
  showSubmitButton = false,
  className = '',
}: SuggestionInputProps) {
  const t = useTranslations('buttonInput');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim(), false);
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Always preventDefault, even when this input sits inside a parent
      // `<form>` (e.g. the puzzle-creator flow). Without this, pressing Enter
      // while composing a per-move SAN would trigger the parent form's native
      // submit and persist a half-finished puzzle.
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Small delay to allow clicking suggestions
    setTimeout(() => setIsFocused(false), UI_TIMEOUTS.MENU_BLUR_DURATION);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion, true);
    onChange('');
    setIsFocused(false);
  };

  const displaySuggestions = showSuggestions && isFocused && suggestions.length > 0;

  return (
    // No `<form>` wrapper here: this component is sometimes mounted inside
    // a parent `<form>` (the puzzle creator), and nested forms are invalid
    // per the HTML spec — browsers drop the inner `<form>` tag during parsing
    // and re-parent its children (including any `type="submit"` button) onto
    // the outer form, which then submits prematurely. Enter-to-submit is
    // handled explicitly in `onKeyDown` above, and the confirm button below
    // is a plain `type="button"` wired to `handleSubmit`.
    <div ref={containerRef} className="relative">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Suggestions Dropdown */}
          {displaySuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg z-50 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  className="w-full px-4 py-4 md:py-2 text-left font-mono text-base md:text-sm text-foreground hover:bg-muted transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-muted"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {showSubmitButton && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
            aria-label={t('action.submit')}
            title={t('action.submit')}
          >
            <FaCheck className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Original MoveInput Wrapper ---

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (move: AlgebraicNotation, usedAutocomplete?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
  showSubmitButton?: boolean;
  className?: string;
};

export function MoveInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'e.g., e4, Nf3, O-O',
  showSuggestions = true,
  showSubmitButton = false,
  className = '',
}: Props) {
  const {
    suggestions,
    showSuggestions: shouldShowSuggestions,
    updateSuggestions,
    hideSuggestions,
  } = useMoveSuggestions({
    enabled: showSuggestions && !disabled,
    onSelect: () => {
      // Logic handled via SuggestionInput's Click or Submit
    },
  });

  // Update suggestions when value changes
  useEffect(() => {
    updateSuggestions(value);
  }, [value, updateSuggestions]);

  return (
    <SuggestionInput
      value={value}
      onChange={onChange}
      onSubmit={(val, usedAutocomplete) => {
        onSubmit(val as AlgebraicNotation, usedAutocomplete);
        hideSuggestions();
      }}
      suggestions={shouldShowSuggestions ? suggestions : []}
      disabled={disabled}
      placeholder={placeholder}
      showSuggestions={showSuggestions}
      showSubmitButton={showSubmitButton}
      className={className}
    />
  );
}
