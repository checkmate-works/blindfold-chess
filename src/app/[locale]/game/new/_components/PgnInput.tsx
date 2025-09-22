'use client';

import { validatePgnWithDetails } from '../../../play/_lib/pgn-parser';

interface PgnInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  translations: {
    pgnTitle: string;
    pgnPlaceholder: string;
    validWithMoves: string;
  };
}

export function PgnInput({ value, onChange, error, translations }: PgnInputProps) {
  const validationResult = value.trim() ? validatePgnWithDetails(value) : null;
  const showSuccess = validationResult?.isValid && value.trim();
  const showError = validationResult && !validationResult.isValid;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{translations.pgnTitle}</h2>
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={translations.pgnPlaceholder}
            className={`
              w-full h-40 px-4 py-3 border-2 rounded-lg bg-muted/20 font-mono text-sm resize-none
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
        {showSuccess && validationResult?.moveCount !== undefined && (
          <p className="text-sm text-muted-foreground">
            ✓{' '}
            {translations.validWithMoves.replace(
              '{moveCount}',
              validationResult.moveCount.toString()
            )}
          </p>
        )}
        {showError && <p className="text-sm text-red-600">✗ {error || validationResult.error}</p>}
      </div>
    </div>
  );
}
