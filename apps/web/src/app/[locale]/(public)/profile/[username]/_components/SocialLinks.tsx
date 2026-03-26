import Image from 'next/image';

import { SiChessdotcom, SiInstagram, SiLichess, SiX, SiYoutube } from 'react-icons/si';

type Props = {
  fideId: string | null;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  xUsername: string | null;
  instagramUsername: string | null;
  youtubeHandle: string | null;
};

export function SocialLinks({
  fideId,
  chesscomUsername,
  lichessUsername,
  xUsername,
  instagramUsername,
  youtubeHandle,
}: Props) {
  const hasAny =
    fideId ||
    chesscomUsername ||
    lichessUsername ||
    xUsername ||
    instagramUsername ||
    youtubeHandle;

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-3">
      {fideId && (
        <a
          href={`https://ratings.fide.com/profile/${fideId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="FIDE profile"
          title="FIDE"
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          <Image src="/images/fide-favicon.ico" alt="FIDE" width={20} height={20} unoptimized />
        </a>
      )}
      {chesscomUsername && (
        <a
          href={`https://www.chess.com/member/${chesscomUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chess.com profile"
          title="Chess.com"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiChessdotcom size={20} />
        </a>
      )}
      {lichessUsername && (
        <a
          href={`https://lichess.org/@/${lichessUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Lichess profile"
          title="Lichess"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiLichess size={20} />
        </a>
      )}
      {xUsername && (
        <a
          href={`https://x.com/${xUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X profile"
          title="X"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiX size={20} />
        </a>
      )}
      {instagramUsername && (
        <a
          href={`https://www.instagram.com/${instagramUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram profile"
          title="Instagram"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiInstagram size={20} />
        </a>
      )}
      {youtubeHandle && (
        <a
          href={`https://www.youtube.com/@${youtubeHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube channel"
          title="YouTube"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiYoutube size={20} />
        </a>
      )}
    </div>
  );
}
