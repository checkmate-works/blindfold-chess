type RankHeaderProps = {
  beltColor: string;
  children: React.ReactNode;
};

export function RankHeader({ beltColor, children }: RankHeaderProps) {
  // White belt needs a visible border since #ffffff is invisible on light backgrounds
  const isWhiteBelt = beltColor === '#ffffff';

  return (
    <>
      {/* Belt color bar */}
      <div
        className="-mx-4 -mt-4 mb-6 h-2 sm:-mx-6 sm:-mt-6"
        style={{
          backgroundColor: beltColor,
          ...(isWhiteBelt ? { borderBottom: '1px solid #d4d4d4' } : {}),
        }}
      />

      <div className="flex items-center gap-3">
        <span
          className="inline-block size-5 shrink-0 rounded-full"
          style={{
            backgroundColor: beltColor,
            ...(isWhiteBelt ? { border: '1px solid #d4d4d4' } : {}),
          }}
        />
        <h2 className="text-2xl font-bold text-foreground">{children}</h2>
      </div>
    </>
  );
}
