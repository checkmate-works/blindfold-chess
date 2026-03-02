import { FaCheck, FaTimes } from 'react-icons/fa';

type Props = {
  correct: number;
  incorrect: number;
  className?: string;
};

export function ScoreCounter({ correct, incorrect, className = '' }: Props) {
  return (
    <div className={`flex justify-center items-center gap-12 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-success/10 text-success">
          <FaCheck className="w-4 h-4" />
        </div>
        <span className="text-xl font-mono font-bold">{correct}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-destructive/10 text-destructive">
          <FaTimes className="w-4 h-4" />
        </div>
        <span className="text-xl font-mono font-bold">{incorrect}</span>
      </div>
    </div>
  );
}
