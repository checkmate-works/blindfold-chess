import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { ImageNodeView } from './ImageNodeView';

/**
 * Extended Tiptap Image extension with `size` and `align` attributes.
 *
 * Adds two custom attributes persisted in the Tiptap JSON document:
 * - `size`: `'large'` (full width) | `'small'` (max 400px) — default `'large'`
 * - `align`: `'left'` | `'center'` | `'right'` — default `'center'`
 *
 * These are serialized as `data-size` / `data-align` HTML attributes and
 * rendered via a custom React NodeView (`ImageNodeView`) that provides
 * toolbar toggles for size and alignment.
 *
 * On public pages, `TiptapRenderer` reads these attributes to apply
 * corresponding CSS classes (`tiptap-render-image-*`).
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'large',
        parseHTML: (element) => element.getAttribute('data-size') ?? 'large',
        renderHTML: (attributes) => {
          return { 'data-size': attributes.size };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => {
          return { 'data-align': attributes.align };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
