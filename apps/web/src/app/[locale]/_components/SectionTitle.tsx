type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = '' }: Props) {
  return <h2 className={`text-lg md:text-xl font-medium ${className}`}>{children}</h2>;
}
