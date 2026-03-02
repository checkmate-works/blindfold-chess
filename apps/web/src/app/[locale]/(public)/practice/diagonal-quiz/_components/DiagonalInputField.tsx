import { useTranslations } from 'next-intl';

import type { ActiveField } from './useDiagonalInput';

type Props = {
  label: string;
  isSingleSquare: boolean;
  activeField: ActiveField;
  fieldType: ActiveField;
  startText: string;
  endText: string;
  isComplete: boolean;
  isDisabled: boolean;
  isInputtingStart: boolean;
  isInputtingEnd: boolean;
  onFieldClick: (field: ActiveField) => void;
};

export function DiagonalInputField({
  label,
  isSingleSquare,
  activeField,
  fieldType,
  startText,
  endText,
  isComplete,
  isDisabled,
  isInputtingStart,
  isInputtingEnd,
  onFieldClick,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1 text-left">
        {label}
        {isSingleSquare && (
          <span className="ml-1 text-xs text-muted-foreground/70">({t('singleSquare')})</span>
        )}
      </label>
      {isSingleSquare ? (
        <button
          type="button"
          onClick={() => onFieldClick(fieldType)}
          disabled={isDisabled}
          className={`w-full px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
            activeField === fieldType && !isDisabled
              ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
              : isComplete
                ? 'border-border bg-muted/50 text-foreground'
                : 'border-border bg-background text-muted-foreground'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {startText || (
            <span className="text-muted-foreground/50">{t('singleSquarePlaceholder')}</span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFieldClick(fieldType)}
            disabled={isDisabled}
            className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
              activeField === fieldType && !isDisabled && isInputtingStart
                ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                : startText
                  ? 'border-border bg-muted/50 text-foreground'
                  : 'border-border bg-background text-muted-foreground'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {startText || (
              <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>
            )}
          </button>
          <span className="text-lg font-mono text-muted-foreground">-</span>
          <button
            type="button"
            onClick={() => onFieldClick(fieldType)}
            disabled={isDisabled}
            className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
              activeField === fieldType && !isDisabled && isInputtingEnd
                ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                : endText
                  ? 'border-border bg-muted/50 text-foreground'
                  : 'border-border bg-background text-muted-foreground'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {endText || <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
