'use client';

import { useEffect, useRef, useState } from 'react';

import type { AlgebraicNotation } from '@/lib/types';

import { useMoveSuggestions } from '../_hooks/use-move-suggestions';

type Props = {
  /**
   * Current input value
   */
  value: string;
  /**
   * Callback when input value changes
   */
  onChange: (value: string) => void;
  /**
   * Callback when a move is submitted
   */
  onSubmit: (move: AlgebraicNotation) => void;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether to show suggestions
   */
  showSuggestions?: boolean;
  /**
   * Whether to show submit button
   */
  showSubmitButton?: boolean;
  /**
   * Additional CSS classes
   */
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
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    suggestions,
    showSuggestions: shouldShowSuggestions,
    updateSuggestions,
    hideSuggestions,
    selectSuggestion,
  } = useMoveSuggestions({
    enabled: showSuggestions && !disabled,
    onSelect: (move) => {
      onChange('');
      onSubmit(move);
    },
  });

  // Update suggestions when value changes
  useEffect(() => {
    updateSuggestions(value);
  }, [value, updateSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim() as AlgebraicNotation);
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      hideSuggestions();
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Small delay to allow clicking suggestions
    setTimeout(hideSuggestions, 150);
  };

  const handleSuggestionClick = (suggestion: AlgebraicNotation) => {
    selectSuggestion(suggestion);
  };

  const displaySuggestions = shouldShowSuggestions && isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
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
            type="submit"
            disabled={disabled || !value.trim()}
            className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
            title="Submit Move"
          >
            ♟️
          </button>
        )}
      </form>
    </div>
  );
}
