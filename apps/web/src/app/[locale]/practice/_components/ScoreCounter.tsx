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
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500">
          <FaCheck className="w-4 h-4" />
        </div>
        <span className="text-xl font-mono font-bold">{correct}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500">
          <FaTimes className="w-4 h-4" />
        </div>
        <span className="text-xl font-mono font-bold">{incorrect}</span>
      </div>
    </div>
  );
}
