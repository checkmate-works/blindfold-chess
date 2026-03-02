'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import {
  getPgnSuggestion,
  validatePgnWithDetails,
} from '@/app/[locale]/(public)/play/_lib/pgn-parser';

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

  // Extract invalid move from error message
  const getInvalidMove = (): string | null => {
    if (!validationResult?.error) {
      return null;
    }

    // Parse "Invalid move in PGN: xyz" pattern (older chess.js)
    const moveErrorMatch = validationResult.error.match(/Invalid move in PGN: (.+)/);
    if (moveErrorMatch) {
      return moveErrorMatch[1];
    }

    // Parse 'Expected ... but "X" found.' pattern (newer chess.js PGN parser)
    const parserErrorMatch = validationResult.error.match(/but "(.+)" found/);
    if (parserErrorMatch) {
      return parserErrorMatch[1];
    }

    return null;
  };

  // Get translated error message
  const getErrorMessage = (): string => {
    const invalidMove = getInvalidMove();
    if (invalidMove) {
      return t('invalidMove', { move: invalidMove });
    }
    return t('invalidPgn');
  };

  // Select invalid move in textarea
  const selectInvalidMove = () => {
    const invalidMove = getInvalidMove();
    if (!invalidMove || !textareaRef.current) return;

    const text = value;
    const index = text.indexOf(invalidMove);
    if (index !== -1) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index + invalidMove.length);
    }
  };

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
              relative w-full ${heightClass} px-4 py-3 border rounded-md bg-transparent font-mono text-base resize-none
              focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-colors
              ${showError ? 'border-destructive focus:ring-destructive/20' : 'border-border focus:border-foreground focus:ring-ring'}
            `}
          />
          {showSuccess && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
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
      {suggestion && isMobile && !showError && (
        <Button variant="outline" size="sm" fullWidth shadow={false} onClick={applySuggestion}>
          {t('completeSuggestion', { suggestion })}
        </Button>
      )}

      {/* Desktop hint */}
      {suggestion && !isMobile && !showError && (
        <p className="text-xs text-muted-foreground">{t('tabToComplete', { suggestion })}</p>
      )}

      {showError &&
        (getInvalidMove() ? (
          <button
            type="button"
            onClick={selectInvalidMove}
            className="text-sm text-destructive hover:underline cursor-pointer text-left"
          >
            {getErrorMessage()}
          </button>
        ) : (
          <p className="text-sm text-destructive">{getErrorMessage()}</p>
        ))}
    </div>
  );
}
