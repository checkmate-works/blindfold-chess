import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { ActiveField } from '@blindfold-chess/features/diagonal-quiz';

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
  /**
   * When set, the field is tinted to signal the answer outcome instead of
   * showing a separate "Correct"/"Incorrect" text label. Coloring an
   * always-present element avoids the layout shift a text flash would cause.
   */
  result?: 'correct' | 'incorrect' | null;
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
  result = null,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  const resultClass =
    result === 'correct'
      ? 'border-success bg-success/10 text-foreground'
      : result === 'incorrect'
        ? 'border-destructive bg-destructive/10 text-foreground'
        : null;

  // The result tint takes precedence over the normal active/filled/empty states.
  const fieldStateClass = (isActive: boolean, hasText: boolean) =>
    resultClass ??
    (isActive
      ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
      : hasText
        ? 'border-border bg-muted/50 text-foreground'
        : 'border-border bg-background text-muted-foreground');

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
          className={`w-full px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors touch-manipulation select-none ${fieldStateClass(
            activeField === fieldType && !isDisabled,
            isComplete
          )} disabled:opacity-50 disabled:cursor-not-allowed`}
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
            className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors touch-manipulation select-none ${fieldStateClass(
              activeField === fieldType && !isDisabled && isInputtingStart,
              !!startText
            )} disabled:opacity-50 disabled:cursor-not-allowed`}
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
            className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors touch-manipulation select-none ${fieldStateClass(
              activeField === fieldType && !isDisabled && isInputtingEnd,
              !!endText
            )} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {endText || <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
