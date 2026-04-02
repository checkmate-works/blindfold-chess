import { FaFlask } from 'react-icons/fa';

type Props = {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

export function BetaNotice({ children, className = '', icon }: Props) {
  return (
    <div
      className={`p-3 bg-warning/10 border border-warning/30 rounded-lg flex gap-3 text-sm text-warning items-start ${className}`}
    >
      {icon ?? <FaFlask className="shrink-0 mt-0.5" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
