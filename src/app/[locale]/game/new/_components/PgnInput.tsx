'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { getPgnSuggestion, validatePgnWithDetails } from '@/app/[locale]/play/_lib/pgn-parser';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const DEBOUNCE_DELAY = 1000;

export function PgnInput({ value, onChange }: Props) {
  const t = useTranslations('newGame');
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPasteRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  // Update suggestion when value changes
  useEffect(() => {
    const newSuggestion = getPgnSuggestion(value);
    setSuggestion(newSuggestion);
  }, [value]);

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

  const validationResult = debouncedValue.trim() ? validatePgnWithDetails(debouncedValue) : null;
  const showSuccess = validationResult?.isValid && debouncedValue.trim();
  const showError = validationResult && !validationResult.isValid;

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

  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Background layer for suggestion display */}
        <div className="relative">
          <div
            className="absolute inset-0 px-4 py-3 font-mono text-sm pointer-events-none whitespace-pre-wrap break-words overflow-hidden"
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
            placeholder={t('pgnPlaceholder')}
            className={`
              relative w-full h-40 px-4 py-3 border-2 rounded-lg bg-transparent font-mono text-sm resize-none
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
          className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          ✨ {t('completeSuggestion', { suggestion })}
        </button>
      )}

      {/* Desktop hint */}
      {suggestion && !isMobile && (
        <p className="text-xs text-muted-foreground">💡 {t('tabToComplete', { suggestion })}</p>
      )}

      {showSuccess && validationResult?.moveCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          ✓ {t('validWithMoves')} {validationResult.moveCount} {t('validWithMovesCount')}
        </p>
      )}
      {showError && <p className="text-sm text-red-600">✗ {t('invalidPgn')}</p>}
    </div>
  );
}
