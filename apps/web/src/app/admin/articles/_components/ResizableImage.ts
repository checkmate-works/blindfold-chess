import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { ImageNodeView } from './ImageNodeView';

/**
 * Extended Image extension that adds `size` ('large' | 'small') and
 * `align` ('left' | 'center' | 'right') attributes, rendered via a
 * custom React NodeView with toggle UIs.
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
