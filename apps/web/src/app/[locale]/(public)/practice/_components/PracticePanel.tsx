type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PracticePanel({ children, className }: Props) {
  return (
    <div className={`bg-card rounded-xl border border-border ${className || ''}`}>{children}</div>
  );
}
