import type { ReactNode } from 'react';

import Image from 'next/image';

import type { BoardTheme } from '@/lib/games/board-themes';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

type Props = {
  /** Override image URL — wins over the board when set. */
  imagePath?: string | null;
  imageAlt?: string;
  /** Board FEN fallback. When this is also unset, `placeholder` shows. */
  fen?: string | null;
  boardTheme?: BoardTheme;
  /** Wrapper classes — sizing/rounding/border belong to the call site. */
  className?: string;
  /** `next/image` intrinsic size hint; the rendered size comes from `className`. */
  imageSize?: number;
  /** Shown when neither image nor board is available (default: a muted box). */
  placeholder?: ReactNode;
};

/**
 * A native-card creative's thumbnail: the uploaded override image when set,
 * else the board rendered from `fen`, else a placeholder. The one renderer
 * behind every surface that previews or serves the thumbnail — the live
 * `NativeAdCard`, the admin slot list, the creative form, and its preview
 * pane — so the "image wins over board" rule can't drift between them.
 * Hook-free on purpose: usable from Server and Client Components alike.
 */
export function CreativeThumbnail({
  imagePath,
  imageAlt,
  fen,
  boardTheme,
  className,
  imageSize = 96,
  placeholder,
}: Props) {
  return (
    <div className={className}>
      {imagePath ? (
        <Image
          src={imagePath}
          alt={imageAlt ?? ''}
          width={imageSize}
          height={imageSize}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : fen ? (
        <BoardThumbnail fen={fen} className="h-full w-full" boardTheme={boardTheme} />
      ) : (
        (placeholder ?? <div className="h-full w-full bg-muted" />)
      )}
    </div>
  );
}
