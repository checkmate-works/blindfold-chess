import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { AttachedEmbedCard } from '@/app/[locale]/(public)/topics/_components/AttachedEmbedCard';
import { AttachedFenCard } from '@/app/[locale]/(public)/topics/_components/AttachedFenCard';
import { AttachedGameCard } from '@/app/[locale]/(public)/topics/_components/AttachedGameCard';
import { AttachedImageCard } from '@/app/[locale]/(public)/topics/_components/AttachedImageCard';
import { AttachedVideoCard } from '@/app/[locale]/(public)/topics/_components/AttachedVideoCard';

export function renderAttachment(
  attachment: PostAttachment,
  fallbackVideoTitle: string
): React.ReactNode {
  switch (attachment.kind) {
    case 'pgn':
      return <AttachedGameCard attachment={attachment.data} />;
    case 'embed':
      return <AttachedEmbedCard attachment={attachment.data} />;
    case 'image':
      return <AttachedImageCard attachments={attachment.data} />;
    case 'fen':
      return <AttachedFenCard attachment={attachment.data} />;
    case 'video':
      return <AttachedVideoCard attachment={attachment.data} fallbackTitle={fallbackVideoTitle} />;
    default: {
      const _exhaustive: never = attachment;
      void _exhaustive;
      return null;
    }
  }
}
