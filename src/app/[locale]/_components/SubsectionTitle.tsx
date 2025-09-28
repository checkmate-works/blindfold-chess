type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SubsectionTitle({ children, className = '' }: Props) {
  return <h3 className={`font-semibold text-foreground ${className}`}>{children}</h3>;
}
