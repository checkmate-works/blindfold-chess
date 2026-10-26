import { Schema, type Slice } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { expect, it } from 'vitest';

it('rejects invalid node attributes supplied through clipboard slice context', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        group: 'block',
        content: 'text*',
        toDOM: () => ['p', 0],
        parseDOM: [{ tag: 'p' }],
      },
      wrapper: {
        group: 'block',
        content: 'block+',
        attrs: { label: { default: '', validate: 'string' } },
        toDOM: () => ['blockquote', 0],
      },
      text: {},
    },
  });
  let pasted: Slice | undefined;
  const view = new EditorView(document.createElement('div'), {
    state: EditorState.create({ schema }),
    handlePaste: (_view, _event, slice) => {
      pasted = slice;
      return true;
    },
  });
  try {
    const context = JSON.stringify([
      'wrapper',
      { label: ['img', { src: 'invalid', onerror: 'alert(1)' }] },
    ]);
    const element = document.createElement('p');
    element.setAttribute('data-pm-slice', `0 0 ${context}`);
    element.textContent = 'safe text';
    view.pasteHTML(element.outerHTML, new Event('paste') as ClipboardEvent);
    expect(pasted).toBeDefined();
    expect(pasted!.content.firstChild!.type.name).toBe('paragraph');
    expect(pasted!.content.textBetween(0, pasted!.content.size)).toBe('safe text');
  } finally {
    view.destroy();
  }
});
