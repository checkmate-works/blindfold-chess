type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SubsectionTitle({ children, className = '' }: Props) {
  return (
    <h3 className={`text-lg md:text-xl font-medium text-foreground ${className}`}>{children}</h3>
  );
}
