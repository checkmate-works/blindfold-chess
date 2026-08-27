'use client';

// `'use client'` island extracted from `MarkdownRenderer.tsx`. The parent
// `MarkdownRenderer` is now a Server Component so that `react-markdown` +
// `rehype-katex` + the custom renderers no longer ship to the client on
// article/learn/manual/announcements routes. This island exists solely to
// contain the `demo:*` image dispatch (`ChessBoardDemo`, `CoordinateBoard`),
// which are interactive client components that cannot live inside an SC. If
// you add new demo types, keep them here — do NOT re-inline this dispatch
// back into `MarkdownRenderer`, which would force the renderer back to
// `'use client'` and restore ~120–150 KB gzip to every markdown route.
import { CoordinateBoard } from '@/app/[locale]/(public)/dojo/ranks/_components';
import { ChessBoardDemo } from '@/app/[locale]/_components/ChessBoardDemo';
import { OperaGameDemo } from '@/app/[locale]/_components/OperaGameDemo';

type Props = {
  alt: string;
};

export function MarkdownDemoImage({ alt }: Props) {
  if (alt === 'demo:coordinate-board') {
    return (
      <div className="my-8">
        <CoordinateBoard />
      </div>
    );
  }
  // The clickable score is chess.js-free; the demo lazy-loads its replay
  // modal on first tap, so this static import adds no chess.js weight to
  // the markdown routes.
  if (alt === 'demo:opera-game') {
    return <OperaGameDemo />;
  }
  const demoType = alt.replace('demo:', '') as 'board-normal' | 'single-colored' | 'stones';
  return <ChessBoardDemo type={demoType} />;
}
