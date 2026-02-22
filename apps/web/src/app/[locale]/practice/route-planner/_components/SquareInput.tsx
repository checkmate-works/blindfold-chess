'use client';

import { useTranslations } from 'next-intl';

import { SquareInput as SharedSquareInput } from '@/app/[locale]/practice/_components/SquareInput';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (square: string) => void;
  availableMoves?: string[];
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
};

const normalize = (input: string): string => input.trim().toLowerCase();

export function SquareInput({
  value,
  onChange,
  onSubmit,
  availableMoves = [],
  disabled = false,
  placeholder,
  showSuggestions = true,
}: Props) {
  const t = useTranslations('practice.routePlanner');

  return (
    <SharedSquareInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      availableMoves={availableMoves}
      disabled={disabled}
      placeholder={placeholder || t('inputPlaceholder')}
      showSuggestions={showSuggestions}
      submitButtonTitle={t('submit')}
      submitIcon="➜"
      inputTransformer={normalize}
      showSuggestionsWhenEmpty={true}
      className="relative w-full"
    />
  );
}
