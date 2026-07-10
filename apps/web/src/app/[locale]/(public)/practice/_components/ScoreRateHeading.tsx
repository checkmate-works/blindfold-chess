type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * The "label: value (n/m)" line atop a practice completion screen's score
 * breakdown (recall's "Recall rate: ...", position-memory / fen's
 * "Accuracy: ..."). Shared so every module renders this readout at the same
 * size.
 */
export function ScoreRateHeading({ children, className = '' }: Props) {
  return <h2 className={`text-xl font-bold text-center ${className}`}>{children}</h2>;
}
