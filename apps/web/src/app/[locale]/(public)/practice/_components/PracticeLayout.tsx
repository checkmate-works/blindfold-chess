type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PracticeLayout({ children, className }: Props) {
  return <div className={`max-w-4xl mx-auto ${className || ''}`}>{children}</div>;
}
