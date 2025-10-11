type Props = {
  children: React.ReactNode;
};

export function PageTitle({ children }: Props) {
  return <h1 className="text-xl font-bold text-foreground">{children}</h1>;
}
