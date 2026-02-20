type Props = {
  currentSquare: string;
  lastAnswer: { correct: boolean; square: string } | null;
};

export function SquareColorQuestionDisplay({ currentSquare, lastAnswer }: Props) {
  return (
    <div className="mb-8">
      <div
        className={`text-6xl font-bold mb-4 transition-colors duration-200 ${
          lastAnswer ? (lastAnswer.correct ? 'text-green-500' : 'text-red-500') : 'text-foreground'
        }`}
      >
        {currentSquare}
      </div>
    </div>
  );
}
