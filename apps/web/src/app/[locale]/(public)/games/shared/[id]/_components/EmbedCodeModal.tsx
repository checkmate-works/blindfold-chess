'use client';

import { useMemo, useState } from 'react';

import { SITE_URL } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiCheck, FiCopy } from 'react-icons/fi';

import {
  DEFAULT_EMBED_HEIGHT,
  DEFAULT_EMBED_OPTIONS,
  type EmbedOptions,
  buildEmbedSnippet,
  buildEmbedUrl,
} from '@/lib/games/embed-snippet';

import { Modal } from '@/app/[locale]/_components/Modal';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  title: string;
  locale: Locale;
  /** Whether "as played" differs from the revealed board anywhere in this game. */
  canReproduce: boolean;
};

type Choice<T extends string> = { value: T; label: string };

/**
 * One row of the option list: a label and its mutually exclusive choices.
 *
 * Native radios rather than a segmented-button widget — same as the
 * repertoire visibility dialog — so keyboard and screen-reader behaviour come
 * for free in a dialog nobody will retest often.
 */
function OptionRow<T extends string>({
  name,
  label,
  choices,
  value,
  onChange,
}: {
  name: string;
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <legend className="float-left mr-3 text-sm font-medium text-foreground">{label}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The "embed this game in your blog" dialog: pick how the widget should look,
 * see exactly that, copy the snippet.
 *
 * The preview is the real embed in a real iframe at the real default height,
 * not a mock-up — the whole risk with an embed code is that what the blogger
 * publishes is not what they expected, and they find out from a reader. It
 * loads a site-relative URL so the preview always shows THIS deployment, while
 * the snippet carries the absolute canonical origin, which is the only form
 * that works once pasted elsewhere.
 */
export function EmbedCodeModal({ isOpen, onClose, gameId, title, locale, canReproduce }: Props) {
  const t = useTranslations('sharedGames');
  const [options, setOptions] = useState<EmbedOptions>(DEFAULT_EMBED_OPTIONS);
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(
    () => buildEmbedSnippet({ siteUrl: SITE_URL, gameId, title, options }),
    [gameId, title, options]
  );
  const previewUrl = useMemo(() => buildEmbedUrl('', gameId, options), [gameId, options]);

  function update(patch: Partial<EmbedOptions>) {
    setOptions((current) => ({ ...current, ...patch }));
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      // Clipboard permission denied / unavailable. The snippet is on screen in
      // a selectable textarea, so there is a manual path and nothing to say.
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('detail.share.embed.title')} trapFocus>
      <div className="space-y-4 px-6 py-4">
        <p className="text-sm text-muted-foreground">{t('detail.share.embed.description')}</p>

        {/* Same cap and height the snippet carries, so what is judged here is
            what gets published. */}
        <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-md border border-border">
          <iframe
            key={previewUrl}
            src={previewUrl}
            title={t('detail.share.embed.previewLabel')}
            className="block w-full"
            height={DEFAULT_EMBED_HEIGHT}
          />
        </div>

        <div className="space-y-2">
          {canReproduce && (
            <OptionRow
              name="embed-view"
              label={t('detail.share.embed.view')}
              value={options.view}
              onChange={(view) => update({ view })}
              choices={[
                { value: 'played', label: t('detail.share.embed.viewPlayed') },
                { value: 'plain', label: t('detail.share.embed.viewPlain') },
              ]}
            />
          )}
          <OptionRow
            name="embed-bg"
            label={t('detail.share.embed.bg')}
            value={options.bg}
            onChange={(bg) => update({ bg })}
            choices={[
              { value: 'auto', label: t('detail.share.embed.bgAuto') },
              { value: 'light', label: t('detail.share.embed.bgLight') },
              { value: 'dark', label: t('detail.share.embed.bgDark') },
            ]}
          />
          <OptionRow
            name="embed-orientation"
            label={t('detail.share.embed.orientation')}
            value={options.orientation}
            onChange={(orientation) => update({ orientation })}
            choices={[
              { value: 'player', label: t('detail.share.embed.orientationPlayer') },
              { value: 'white', label: t('detail.share.embed.orientationWhite') },
              { value: 'black', label: t('detail.share.embed.orientationBlack') },
            ]}
          />
          {/* Not an option row: pinning the language is a departure from the
              default (follow each reader), so it reads as a single opt-in. */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={options.lang !== null}
              onChange={(e) => update({ lang: e.target.checked ? locale : null })}
            />
            {t('detail.share.embed.pinLanguage')}
          </label>
        </div>

        <div className="space-y-2">
          <textarea
            readOnly
            value={snippet}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-border bg-muted/40 p-2 font-mono text-xs text-foreground"
            aria-label={t('detail.share.embed.codeLabel')}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? (
              <FiCheck className="h-4 w-4" aria-hidden />
            ) : (
              <FiCopy className="h-4 w-4" aria-hidden />
            )}
            {copied ? t('detail.share.embed.copied') : t('detail.share.embed.copy')}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">{t('detail.share.embed.hint')}</p>
      </div>
    </Modal>
  );
}
