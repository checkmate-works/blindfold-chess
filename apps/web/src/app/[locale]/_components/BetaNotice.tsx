import { FaFlask } from 'react-icons/fa';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function BetaNotice({ children, className = '' }: Props) {
  return (
    <div
      className={`p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex gap-3 text-sm text-amber-800 dark:text-amber-200 items-start ${className}`}
    >
      <FaFlask className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
