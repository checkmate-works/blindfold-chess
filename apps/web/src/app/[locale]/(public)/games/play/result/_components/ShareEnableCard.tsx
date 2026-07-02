import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaShareAlt } from 'react-icons/fa';

type Props = {
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * Local-mode counterpart to the shared game's discussion feed. A finished game
 * is not persisted server-side, so it has no comments / chunk links / likes yet;
 * this card sits where the discussion would be and prompts the player to share
 * the game to unlock those social features (mirrors the "share to enable
 * discussion" teaser). The Share button routes to the published game if it was
 * already shared from this browser, else to the publish form.
 */
export function ShareEnableCard({ onShare, isShared }: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center">
      <p className="text-sm text-muted-foreground">{t('result.sharePrompt')}</p>
      <Button
        variant="primary"
        icon={<FaShareAlt className="h-4 w-4" />}
        onClick={onShare}
        className="rounded-lg"
      >
        {isShared ? t('result.viewShared') : t('result.publish')}
      </Button>
    </div>
  );
}
