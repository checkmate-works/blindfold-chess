type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PracticePanel({ children, className }: Props) {
  return (
    <div className={`bg-card rounded-xl shadow-sm border border-border ${className || ''}`}>
      {children}
    </div>
  );
}
