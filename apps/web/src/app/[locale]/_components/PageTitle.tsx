type Props = {
  children: React.ReactNode;
};

export function PageTitle({ children }: Props) {
  return <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{children}</h1>;
}
