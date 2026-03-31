type Props = {
  currentSquare: string;
  lastAnswer: { correct: boolean; square: string } | null;
  className?: string;
};

export function SquareColorQuestionDisplay({
  currentSquare,
  lastAnswer,
  className = 'mb-8',
}: Props) {
  return (
    <div className={className}>
      <div
        className={`text-6xl font-bold mb-4 transition-colors duration-200 ${
          lastAnswer
            ? lastAnswer.correct
              ? 'text-success'
              : 'text-destructive'
            : 'text-foreground'
        }`}
      >
        {currentSquare}
      </div>
    </div>
  );
}
