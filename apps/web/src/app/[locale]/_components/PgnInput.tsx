'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { getPgnSuggestion, validatePgnWithDetails } from '@/app/[locale]/play/_lib/pgn-parser';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Custom placeholder text. If not provided, uses default from translations */
  placeholder?: string;
  /** Custom height class for textarea (e.g., 'h-40', 'h-32'). Defaults to 'h-40' */
  heightClass?: string;
  /**
   * Whether to show real-time validation feedback.
   * Set to false when PGN validation depends on external context (e.g., custom FEN).
   * Defaults to true.
   */
  showValidation?: boolean;
};

const DEBOUNCE_DELAY = 1000;

export function PgnInput({
  value,
  onChange,
  placeholder,
  heightClass = 'h-40',
  showValidation = true,
}: Props) {
  const t = useTranslations('pgnInput');
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPasteRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  // Calculate suggestion from value
  const suggestion = useMemo(() => getPgnSuggestion(value), [value]);

  // Update debounced value when value changes
  useEffect(() => {
    // If this was a paste operation, update immediately
    if (isPasteRef.current) {
      setDebouncedValue(value);
      isPasteRef.current = false;
      return;
    }

    // Otherwise, debounce the update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  const validationResult =
    showValidation && debouncedValue.trim() ? validatePgnWithDetails(debouncedValue) : null;
  const showSuccess = showValidation && validationResult?.isValid && debouncedValue.trim();
  const showError = showValidation && validationResult && !validationResult.isValid;

  const handlePaste = () => {
    isPasteRef.current = true;
  };

  const applySuggestion = () => {
    if (suggestion) {
      onChange(value + suggestion);
      // Focus textarea after applying suggestion
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key for completion
    if (e.key === 'Tab' && suggestion && !isMobile) {
      e.preventDefault();
      applySuggestion();
    }
  };

  const defaultPlaceholder = t('placeholder');

  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Background layer for suggestion display */}
        <div className="relative">
          <div
            className={`absolute inset-0 px-4 py-3 font-mono text-base pointer-events-none whitespace-pre-wrap break-words overflow-hidden`}
            aria-hidden="true"
          >
            <span className="invisible">{value}</span>
            {suggestion && !isMobile && (
              <span className="text-muted-foreground/50">{suggestion}</span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || defaultPlaceholder}
            inputMode="text"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            className={`
              relative w-full ${heightClass} px-4 py-3 border-2 rounded-md bg-transparent font-mono text-base resize-none
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-20 transition-colors
              ${showError ? 'border-red-500' : 'border-border focus:border-foreground'}
            `}
          />
          {showSuccess && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile suggestion button */}
      {suggestion && isMobile && (
        <button
          type="button"
          onClick={applySuggestion}
          className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors"
        >
          {t('completeSuggestion', { suggestion })}
        </button>
      )}

      {/* Desktop hint */}
      {suggestion && !isMobile && (
        <p className="text-xs text-muted-foreground">{t('tabToComplete', { suggestion })}</p>
      )}

      {showSuccess && validationResult?.moveCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          {t('validWithMoves', { count: validationResult.moveCount })}
        </p>
      )}
      {showError && <p className="text-sm text-red-600">{t('invalidPgn')}</p>}
    </div>
  );
}
