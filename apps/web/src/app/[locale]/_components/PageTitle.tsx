type Props = {
  children: React.ReactNode;
};

export function PageTitle({ children }: Props) {
  return <h1 className="text-3xl md:text-4xl font-semibold text-foreground">{children}</h1>;
}
