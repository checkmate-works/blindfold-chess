'use client';

import { useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { SquareInput as SharedSquareInput } from '@/app/[locale]/practice/_components/SquareInput';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (square: string) => void;
  availableMoves: string[];
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
};

const stripPrefix = (input: string): string => {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('n') ? trimmed.slice(1) : trimmed;
};

const formatSuggestion = (suggestion: string): string => `N${suggestion}`;

const formatTabComplete = (suggestion: string): string => `N${suggestion}`;

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

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onSubmit(suggestion);
      onChange('');
    },
    [onSubmit, onChange]
  );

  return (
    <SharedSquareInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      availableMoves={availableMoves}
      disabled={disabled}
      placeholder={placeholder || t('inputSquare')}
      showSuggestions={showSuggestions}
      submitButtonTitle={t('submitMove')}
      submitIcon="♞"
      inputTransformer={stripPrefix}
      suggestionFormatter={formatSuggestion}
      tabCompleteFormatter={formatTabComplete}
      onSuggestionClick={handleSuggestionClick}
    />
  );
}
