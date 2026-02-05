export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

type Props = {
  activeQuadrant?: QuadrantId | null;
  correctQuadrant?: QuadrantId | null;
  wrongQuadrant?: QuadrantId | null;
  onQuadrantClick: (id: QuadrantId) => void;
  disabled?: boolean;
  orientation?: 'white' | 'black';
};

export default function QuadrantBoard({
  correctQuadrant,
  wrongQuadrant,
  onQuadrantClick,
  disabled,
  orientation = 'white',
}: Props) {
  // No border styles on buttons, only background
  const getButtonClass = (id: QuadrantId) => {
    let base = 'relative w-full h-full transition-colors';
    if (correctQuadrant === id) base += ' bg-green-500/40';
    else if (wrongQuadrant === id) base += ' bg-red-500/40';
    return base;
  };

  const getButtonProps = (visualId: 'tl' | 'tr' | 'bl' | 'br') => {
    const id = getVisualQuadrantId(visualId);
    return {
      className: getButtonClass(id),
      onClick: () => onQuadrantClick(id),
      disabled: disabled,
    };
  };

  // Map visual position to logical quadrant based on orientation
  // White: TL=q2, TR=q1, BL=q3, BR=q4
  // Black: TL=q4, TR=q3, BL=q1, BR=q2
  const getVisualQuadrantId = (position: 'tl' | 'tr' | 'bl' | 'br'): QuadrantId => {
    if (orientation === 'white') {
      switch (position) {
        case 'tl':
          return 'q2';
        case 'tr':
          return 'q1';
        case 'bl':
          return 'q3';
        case 'br':
          return 'q4';
      }
    } else {
      switch (position) {
        case 'tl':
          return 'q4';
        case 'tr':
          return 'q3';
        case 'bl':
          return 'q1';
        case 'br':
          return 'q2';
      }
    }
  };

  // Determine line segment color based on active quadrant
  const getSegmentColor = (segments: ('tl' | 'tr' | 'bl' | 'br')[]) => {
    // If any of the segments match the currently highlighted quadrant, return highlight color
    for (const seg of segments) {
      const segId = getVisualQuadrantId(seg);
      if (correctQuadrant === segId) return 'bg-green-500 z-40';
      if (wrongQuadrant === segId) return 'bg-red-500 z-40';
    }
    return 'bg-black z-20';
  };

  return (
    <div className="relative w-full max-w-[400px] mx-auto aspect-square rounded-lg overflow-hidden shadow-lg select-none bg-white">
      {/* 1. Grid of Buttons (Backgrounds & Interaction) - Z-0/Z-10 */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 z-10">
        <button {...getButtonProps('tl')} />
        <button {...getButtonProps('tr')} />
        <button {...getButtonProps('bl')} />
        <button {...getButtonProps('br')} />
      </div>

      {/* 2. Segmented Overlay Lines (Borders) - Z-20 (Black) / Z-40 (Highlight) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* CENTER CROSS */}
        {/* Vertical Top Half (Between TL and TR) */}
        <div
          className={`absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2 ${getSegmentColor(['tl', 'tr'])}`}
        />
        {/* Vertical Bottom Half (Between BL and BR) */}
        <div
          className={`absolute left-1/2 bottom-0 h-1/2 w-0.5 -translate-x-1/2 ${getSegmentColor(['bl', 'br'])}`}
        />

        {/* Horizontal Left Half (Between TL and BL) */}
        <div
          className={`absolute top-1/2 left-0 w-1/2 h-0.5 -translate-y-1/2 ${getSegmentColor(['tl', 'bl'])}`}
        />
        {/* Horizontal Right Half (Between TR and BR) */}
        <div
          className={`absolute top-1/2 right-0 w-1/2 h-0.5 -translate-y-1/2 ${getSegmentColor(['tr', 'br'])}`}
        />

        {/* OUTER FRAME (2px width) */}
        {/* Top Edge - Left Half */}
        <div className={`absolute top-0 left-0 w-1/2 h-0.5 ${getSegmentColor(['tl'])}`} />
        {/* Top Edge - Right Half */}
        <div className={`absolute top-0 right-0 w-1/2 h-0.5 ${getSegmentColor(['tr'])}`} />

        {/* Bottom Edge - Left Half */}
        <div className={`absolute bottom-0 left-0 w-1/2 h-0.5 ${getSegmentColor(['bl'])}`} />
        {/* Bottom Edge - Right Half */}
        <div className={`absolute bottom-0 right-0 w-1/2 h-0.5 ${getSegmentColor(['br'])}`} />

        {/* Left Edge - Top Half */}
        <div className={`absolute top-0 left-0 h-1/2 w-0.5 ${getSegmentColor(['tl'])}`} />
        {/* Left Edge - Bottom Half */}
        <div className={`absolute bottom-0 left-0 h-1/2 w-0.5 ${getSegmentColor(['bl'])}`} />

        {/* Right Edge - Top Half */}
        <div className={`absolute top-0 right-0 h-1/2 w-0.5 ${getSegmentColor(['tr'])}`} />
        {/* Right Edge - Bottom Half */}
        <div className={`absolute bottom-0 right-0 h-1/2 w-0.5 ${getSegmentColor(['br'])}`} />
      </div>
    </div>
  );
}
