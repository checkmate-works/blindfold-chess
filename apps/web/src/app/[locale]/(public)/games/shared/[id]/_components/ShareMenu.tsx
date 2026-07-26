'use client';

import { useState } from 'react';

import { SITE_URL } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaXTwitter } from 'react-icons/fa6';
import { FiDownload, FiLink, FiShare2 } from 'react-icons/fi';

import { encodeGameShortId } from '@/lib/games/short-id';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type GifVariant = 'plain' | 'played';

type Props = {
  gameId: string;
  title: string;
  locale: Locale;
  /** Whether `?view=played` renders a meaningfully different board (hidden-board game). */
  hasPlayedVariant: boolean;
};

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

/**
 * Viewer-facing share menu for a public game (link copy / X / GIF download),
 * distinct from `OwnerActions` (edit/delete) — visible to everyone, not just
 * the owner. It sits in the engagement row next to the like button (the SNS
 * convention, and the row this app already reserves for post-level actions on
 * every UGC detail page) rather than beside the page title, which is the help
 * tour's slot everywhere else.
 *
 * GIF download goes through `fetch` + a synthetic `<a download>`
 * rather than a plain anchor so a loading spinner can cover the first-request
 * generation latency (SPEC2 §4); the API route streams the bytes from the
 * same origin with `Content-Disposition: attachment`, so this still saves
 * to disk rather than navigating.
 */
export function ShareMenu({ gameId, title, locale, hasPlayedVariant }: Props) {
  const t = useTranslations('sharedGames');
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState<GifVariant | null>(null);

  // Copying hands the URL to a human, who may paste it somewhere that shows it
  // verbatim (LINE, Discord, a QR code, a slide), so it gets the short form.
  const shortUrl = `${SITE_URL}/g/${encodeGameShortId(gameId)}`;
  // X rewrites every link to a 23-character t.co URL, so the short form buys
  // nothing there and would only add a redirect hop for the card crawler to
  // follow. Hand X the canonical page directly.
  const canonicalUrl = `${SITE_URL}/${locale}/games/shared/${gameId}`;
  const xIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(canonicalUrl)}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast(t('detail.share.copied'), 'success');
    } catch {
      // Clipboard permission denied / unavailable in this browser context —
      // no fallback UI worth adding for this rare case.
    }
  }

  function handleShareOnX() {
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDownloadGif(variant: GifVariant) {
    if (downloading) return;
    setDownloading(variant);
    try {
      const query = variant === 'played' ? '?view=played' : '';
      const res = await fetch(`/api/games/${gameId}/gif${query}`);
      if (!res.ok) throw new Error('gif_fetch_failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `blindfold-chess-${gameId}${variant === 'played' ? '-played' : ''}.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showToast(t('detail.errors.generic'), 'error');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <ActionsMenu
      ariaLabel={t('detail.share.menuLabel')}
      label={t('detail.share.menuLabel')}
      icon={<FiShare2 className="h-5 w-5" aria-hidden />}
      align="left"
    >
      <ActionsMenuButton onClick={handleCopyLink}>
        <FiLink className="h-4 w-4" aria-hidden />
        {t('detail.share.copyLink')}
      </ActionsMenuButton>
      <ActionsMenuButton onClick={handleShareOnX}>
        <FaXTwitter className="h-4 w-4" aria-hidden />
        {t('detail.share.shareOnX')}
      </ActionsMenuButton>
      <ActionsMenuButton onClick={() => handleDownloadGif('plain')} disabled={downloading !== null}>
        {downloading === 'plain' ? <Spinner /> : <FiDownload className="h-4 w-4" aria-hidden />}
        {t('detail.share.downloadGif')}
      </ActionsMenuButton>
      {hasPlayedVariant && (
        <ActionsMenuButton
          onClick={() => handleDownloadGif('played')}
          disabled={downloading !== null}
        >
          {downloading === 'played' ? <Spinner /> : <FiDownload className="h-4 w-4" aria-hidden />}
          {t('detail.share.downloadGifAsPlayed')}
        </ActionsMenuButton>
      )}
      <div className="max-w-64 px-3 py-2 text-xs text-muted-foreground">
        {t('detail.share.gifHint')}
      </div>
    </ActionsMenu>
  );
}
