type Props = {
  children: React.ReactNode;
};

export function PageTitle({ children }: Props) {
  return (
    <h1 className="text-xl md:text-2xl font-light text-foreground text-center mb-8">{children}</h1>
  );
}
