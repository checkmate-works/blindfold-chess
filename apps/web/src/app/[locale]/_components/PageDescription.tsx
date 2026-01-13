type Props = {
  children: React.ReactNode;
};

export function PageDescription({ children }: Props) {
  return <p className="text-lg text-muted-foreground leading-relaxed">{children}</p>;
}
