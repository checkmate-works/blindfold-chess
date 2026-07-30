import { isWhiteBelt } from '../_lib/belt-colors';

type RankHeaderProps = {
  beltColor: string;
  children: React.ReactNode;
  /**
   * Optional trailing content rendered at the end of the dot+title row
   * (`ml-auto`). Used by the rank detail page for the achievement
   * checkmark; omitted everywhere else (e.g. guide chapter headers, which
   * reuse this same component but have no achievement concept).
   */
  trailing?: React.ReactNode;
};

export function RankHeader({ beltColor, children, trailing }: RankHeaderProps) {
  // White belt needs a visible border since #ffffff is invisible on light backgrounds
  const whiteBelt = isWhiteBelt(beltColor);

  return (
    <>
      {/* Belt color bar */}
      <div
        className="-mx-4 -mt-4 mb-6 h-2 sm:-mx-6 sm:-mt-6"
        style={{
          backgroundColor: beltColor,
          ...(whiteBelt ? { borderBottom: '1px solid #d4d4d4' } : {}),
        }}
      />

      <div className="flex items-center gap-3">
        <span
          className="inline-block size-5 shrink-0 rounded-full"
          style={{
            backgroundColor: beltColor,
            ...(whiteBelt ? { border: '1px solid #d4d4d4' } : {}),
          }}
        />
        <h2 className="text-2xl font-bold text-foreground">{children}</h2>
        {trailing && <span className="ml-auto">{trailing}</span>}
      </div>
    </>
  );
}
