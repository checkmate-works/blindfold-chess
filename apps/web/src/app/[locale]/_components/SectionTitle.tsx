type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = '' }: Props) {
  return <h2 className={`font-medium ${className}`}>{children}</h2>;
}
