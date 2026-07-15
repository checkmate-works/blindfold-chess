type Props = {
  children: React.ReactNode;
  className?: string;
  /** DOM id for hash-anchor scrolling (e.g. linking here as `#comments`). */
  id?: string;
};

export function SectionTitle({ children, className = '', id }: Props) {
  return (
    <h2
      id={id}
      className={`text-base md:text-lg font-medium border-b border-border pb-2 leading-normal ${id ? 'scroll-mt-20 ' : ''}${className}`}
    >
      {children}
    </h2>
  );
}
