// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createTiptapExtensions } from './tiptap-extensions';

let editor: Editor | undefined;

function createEditor(): Editor {
  editor = new Editor({ extensions: createTiptapExtensions({ placeholder: '' }) });
  return editor;
}

function youtubeSrcs(target: Editor): unknown[] {
  const srcs: unknown[] = [];
  target.state.doc.descendants((node) => {
    if (node.type.name === 'youtube') srcs.push(node.attrs.src);
  });
  return srcs;
}

// jsdom has no ClipboardEvent, which `pasteText` would otherwise construct.
function paste(target: Editor, text: string): void {
  target.view.pasteText(text, new Event('paste') as ClipboardEvent);
}

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe('youtube setYoutubeVideo command', () => {
  it('stores an accepted URL in canonical form', () => {
    const target = createEditor();

    expect(
      target.commands.setYoutubeVideo({ src: ' https://WWW.YouTube.com/live/dQw4w9WgXcQ ' })
    ).toBe(true);
    expect(youtubeSrcs(target)).toEqual(['https://www.youtube.com/live/dQw4w9WgXcQ']);
  });

  it.each([
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtu.be/dQw4w9WgXcQ',
  ])('rejects %s, which the stock tiptap command would accept', (src) => {
    const target = createEditor();

    expect(target.commands.setYoutubeVideo({ src })).toBe(false);
    expect(youtubeSrcs(target)).toEqual([]);
  });
});

describe('youtube paste rule', () => {
  it('turns a pasted accepted URL into a youtube node', () => {
    const target = createEditor();

    paste(target, 'https://youtu.be/dQw4w9WgXcQ?si=abc');

    expect(youtubeSrcs(target)).toEqual(['https://youtu.be/dQw4w9WgXcQ?si=abc']);
  });

  it('leaves a pasted rejected URL as text', () => {
    const target = createEditor();

    paste(target, 'https://m.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(youtubeSrcs(target)).toEqual([]);
    expect(target.getText()).toContain('m.youtube.com');
  });
});
