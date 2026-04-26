type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = '' }: Props) {
  return (
    <h2
      className={`text-base md:text-lg font-medium border-b border-border pb-2 leading-normal ${className}`}
    >
      {children}
    </h2>
  );
}
