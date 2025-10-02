type Props = {
  children: React.ReactNode;
};

export function PageDescription({ children }: Props) {
  return <p className="text-muted-foreground">{children}</p>;
}
