type RankHeaderProps = {
  beltColor: string;
  children: React.ReactNode;
};

export function RankHeader({ beltColor, children }: RankHeaderProps) {
  return (
    <>
      {/* Belt color bar */}
      <div
        className="-mx-4 -mt-4 mb-6 h-2 sm:-mx-6 sm:-mt-6"
        style={{ backgroundColor: beltColor }}
      />

      <div className="flex items-center gap-3">
        <span
          className="inline-block size-5 shrink-0 rounded-full"
          style={{ backgroundColor: beltColor }}
        />
        <h2 className="text-2xl font-bold text-foreground">{children}</h2>
      </div>
    </>
  );
}
