type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = '' }: Props) {
  return <h2 className={`text-xl md:text-2xl font-medium ${className}`}>{children}</h2>;
}
