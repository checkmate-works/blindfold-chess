'use client';

import { CoordinateBoard } from '@/app/[locale]/(public)/ranks/_components';
import { ChessBoardDemo } from '@/app/[locale]/_components/ChessBoardDemo';

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
  const demoType = alt.replace('demo:', '') as 'board-normal' | 'single-colored' | 'stones';
  return <ChessBoardDemo type={demoType} />;
}
