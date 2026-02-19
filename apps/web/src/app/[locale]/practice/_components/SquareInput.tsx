'use client';

import { useMemo, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (square: string) => void;
  availableMoves?: string[];
  disabled?: boolean;
  placeholder: string;
  showSuggestions?: boolean;
  submitButtonTitle: string;
  submitIcon: string;
  inputTransformer: (input: string) => string;
  suggestionFormatter?: (suggestion: string) => string;
  tabCompleteFormatter?: (suggestion: string) => string;
  onSuggestionClick?: (suggestion: string) => void;
  showSuggestionsWhenEmpty?: boolean;
  className?: string;
};

export function SquareInput({
  value,
  onChange,
  onSubmit,
  availableMoves = [],
  disabled = false,
  placeholder,
  showSuggestions = true,
  submitButtonTitle,
  submitIcon,
  inputTransformer,
  suggestionFormatter,
  tabCompleteFormatter,
  onSuggestionClick,
  showSuggestionsWhenEmpty = false,
  className = 'relative',
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    if (!value.trim()) return showSuggestionsWhenEmpty ? availableMoves : [];
    const input = inputTransformer(value);
    if (!input) return availableMoves;
    return availableMoves.filter((move) => move.toLowerCase().startsWith(input));
  }, [value, availableMoves, showSuggestions, showSuggestionsWhenEmpty, inputTransformer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const square = inputTransformer(value);
    if (square) {
      onSubmit(square);
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
      const formatted = tabCompleteFormatter
        ? tabCompleteFormatter(suggestions[0])
        : suggestions[0];
      onChange(formatted);
    }
  };

  const handleSuggestionItemClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      onSubmit(suggestion);
    }
  };

  const displaySuggestions = showSuggestions && isFocused && suggestions.length > 0;
  const formatSuggestion = suggestionFormatter ?? ((s: string) => s);

  return (
    <div className={className}>
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
            placeholder={placeholder}
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
                  onClick={() => handleSuggestionItemClick(suggestion)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {formatSuggestion(suggestion)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="w-14 h-14 bg-muted hover:bg-foreground hover:text-background disabled:bg-muted disabled:cursor-not-allowed text-foreground font-medium rounded-md transition-all duration-150 flex items-center justify-center text-xl border border-border"
          title={submitButtonTitle}
        >
          {submitIcon}
        </button>
      </form>
    </div>
  );
}
