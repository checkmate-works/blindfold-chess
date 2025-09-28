type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = '' }: Props) {
  return <h2 className={`text-lg font-semibold mb-4 ${className}`}>{children}</h2>;
}
