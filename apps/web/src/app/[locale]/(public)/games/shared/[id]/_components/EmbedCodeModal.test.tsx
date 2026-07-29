/**
 * The dialog's contract with the blogger: the code they copy matches the
 * options they picked, and the preview they judged it by is that same URL.
 *
 * Translations resolve through the mocked fallback (which echoes the key), so
 * controls are addressed by their key names.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmbedCodeModal } from './EmbedCodeModal';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const GAME_ID = '019f8e93-32ad-750e-894e-267acf1575e2';

function open(props: Partial<Parameters<typeof EmbedCodeModal>[0]> = {}) {
  return render(
    <EmbedCodeModal
      isOpen
      onClose={() => {}}
      gameId={GAME_ID}
      title="Blindfold win"
      locale="ja"
      canReproduce
      {...props}
    />
  );
}

const snippet = () =>
  (screen.getByLabelText('detail.share.embed.codeLabel') as HTMLTextAreaElement).value;

const previewSrc = () =>
  screen.getByTitle('detail.share.embed.previewLabel').getAttribute('src') ?? '';

afterEach(() => cleanup());

describe('EmbedCodeModal', () => {
  it('offers a snippet with no query at all before anything is changed', () => {
    open();
    expect(snippet()).toContain(`/embed/g/AZ-OkzKtdQ6JTiZ6zxV14g"`);
    expect(previewSrc()).toBe('/embed/g/AZ-OkzKtdQ6JTiZ6zxV14g');
  });

  it('previews the same URL the snippet carries', () => {
    open();
    fireEvent.click(screen.getByLabelText('detail.share.embed.bgDark'));
    fireEvent.click(screen.getByLabelText('detail.share.embed.orientationBlack'));

    // The snippet is HTML, so its `&` is escaped; the preview src is a plain
    // URL. Same params either way — that is what makes the preview honest.
    expect(snippet()).toContain('?color=black&amp;bg=dark');
    expect(previewSrc()).toBe('/embed/g/AZ-OkzKtdQ6JTiZ6zxV14g?color=black&bg=dark');
  });

  it('pins the widget to the page the blogger is writing in, not the reader', () => {
    open({ locale: 'ja' });
    fireEvent.click(screen.getByLabelText('detail.share.embed.pinLanguage'));
    expect(snippet()).toContain('lang=ja');

    fireEvent.click(screen.getByLabelText('detail.share.embed.pinLanguage'));
    expect(snippet()).not.toContain('lang=');
  });

  it('hides the as-played choice for a game that hid nothing', () => {
    open({ canReproduce: false });
    expect(screen.queryByLabelText('detail.share.embed.viewPlain')).toBeNull();
    // ...and never emits the param that choice controls.
    expect(snippet()).not.toContain('view=');
  });

  it('copies exactly what is on screen', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    open();

    fireEvent.click(screen.getByLabelText('detail.share.embed.bgLight'));
    fireEvent.click(screen.getByText('detail.share.embed.copy'));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(snippet()));
    expect(await screen.findByText('detail.share.embed.copied')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('drops the copied confirmation once the options no longer match it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    open();

    fireEvent.click(screen.getByText('detail.share.embed.copy'));
    expect(await screen.findByText('detail.share.embed.copied')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('detail.share.embed.bgDark'));
    expect(screen.getByText('detail.share.embed.copy')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
