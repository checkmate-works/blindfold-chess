import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaAttachmentInput } from './MediaAttachmentInput';
import type { MediaAttachmentMode } from './MediaAttachmentInput';

afterEach(() => {
  cleanup();
});

function setup() {
  const onModeChange = vi.fn<(mode: MediaAttachmentMode) => void>();
  const onChange = vi.fn<(hasContent: boolean) => void>();
  const result = render(<MediaAttachmentInput onChange={onChange} onModeChange={onModeChange} />);
  return { onModeChange, onChange, ...result };
}

function lastMode(onModeChange: ReturnType<typeof vi.fn>): MediaAttachmentMode {
  const calls = onModeChange.mock.calls;
  return calls[calls.length - 1]?.[0] as MediaAttachmentMode;
}

describe('MediaAttachmentInput', () => {
  it('renders the image sub-input by default and reports empty mode', () => {
    const { container, onModeChange } = setup();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('reports image mode after selecting a file', () => {
    const { container, onModeChange } = setup();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('image');
    if (mode.kind === 'image') {
      expect(mode.files.length).toBe(1);
      expect(mode.files[0].name).toBe('a.png');
    }
  });

  it('switches to video sub-input and surfaces the URL trimmed', () => {
    const { container, onModeChange } = setup();
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = container.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: '   https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' },
    });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('video');
    if (mode.kind === 'video') {
      expect(mode.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
  });

  it('caps the file selection at MAX_IMAGES_PER_POST (3)', () => {
    const { container, onModeChange } = setup();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from(
      { length: 5 },
      (_, i) => new File([`x`], `f${i}.png`, { type: 'image/png' })
    );
    fireEvent.change(fileInput, { target: { files } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('image');
    if (mode.kind === 'image') {
      expect(mode.files.length).toBe(3);
    }
  });

  it('switching from image with files selected to video reports empty until URL is typed', () => {
    const { container, onModeChange } = setup();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });
    expect(lastMode(onModeChange).kind).toBe('image');
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('a11y: sub-kind selector is a radiogroup with two radios, image checked by default', () => {
    const { container } = setup();
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    const radios = container.querySelectorAll('input[name="mediaAttachmentKind"]');
    expect(radios.length).toBe(2);
    const checked = container.querySelector(
      'input[name="mediaAttachmentKind"]:checked'
    ) as HTMLInputElement;
    expect(checked.value).toBe('image');
  });
});
