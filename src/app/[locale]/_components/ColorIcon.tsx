interface Props {
  color: 'white' | 'black';
  className?: string;
}

export function ColorIcon({ color, className = 'w-4 h-4' }: Props) {
  if (color === 'white') {
    return <div className={`${className} rounded-full bg-white border border-border`} />;
  }
  return <div className={`${className} rounded-full bg-black border border-border`} />;
}
