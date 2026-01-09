type Props = {
  className?: string;
};

export function Divider({ className = '' }: Props) {
  return <hr className={`border-t border-border ${className}`} />;
}
