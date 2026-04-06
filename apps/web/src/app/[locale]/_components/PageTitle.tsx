type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PageTitle({ children, className = '' }: Props) {
  return (
    <h1 className={`text-xl md:text-2xl font-light text-foreground text-center ${className}`}>
      {children}
    </h1>
  );
}
