import { useTranslations } from 'next-intl';

type Props = {
  isCorrect: boolean | null; // null means no feedback yet/reset
  isVisible: boolean; // Control visibility explicitly if needed, or rely on isCorrect !== null
  correctMessage?: string;
  incorrectMessage?: string;
  className?: string;
};

export function AnswerFeedback({
  isCorrect,
  isVisible,
  correctMessage,
  incorrectMessage,
  className = '',
}: Props) {
  const t = useTranslations('practice');

  if (!isVisible || isCorrect === null) return null;

  return (
    <div className={`flex justify-center h-8 ${className}`}>
      {isCorrect && (
        <span className="text-success font-bold animate-in fade-in zoom-in text-lg">
          {correctMessage || t('correct')}
        </span>
      )}
      {!isCorrect && (
        <span className="text-destructive font-bold animate-in fade-in zoom-in text-lg">
          {incorrectMessage || t('incorrect')}
        </span>
      )}
    </div>
  );
}
