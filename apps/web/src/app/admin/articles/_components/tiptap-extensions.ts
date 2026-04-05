import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { IMAGE_CLASS } from '../_lib/constants';
import { extractYouTubeVideoId } from '../_lib/youtube';
import { ResizableImage } from './ResizableImage';
import { XEmbed } from './XEmbed';
import { XEmbedNodeView } from './XEmbedNodeView';
import { YoutubeNodeView } from './YoutubeNodeView';

type CreateExtensionsOptions = {
  placeholder: string;
};

/**
 * Create the Tiptap extension stack used by the admin article editor.
 *
 * Extensions included:
 * - **StarterKit** — paragraph, heading (h2, h3), bold, italic, strike,
 *   code, codeBlock, bulletList, orderedList, blockquote, horizontalRule, hardBreak.
 * - **Link** — inline hyperlinks (opens in new tab from renderer; click disabled in editor).
 * - **Placeholder** — ghost text when editor is empty.
 * - **ResizableImage** — image with `size` (large/small) and `align` (left/center/right)
 *   attributes, rendered via a custom React NodeView with toggle controls.
 * - **Youtube** — YouTube embed with custom NodeView and privacy-enhanced URLs
 *   (`youtube-nocookie.com`).
 * - **XEmbed** — X (formerly Twitter) embed with custom NodeView; uses `react-tweet`
 *   for rendering on public pages.
 *
 * @remarks
 * The node name for X embeds is kept as `'twitterEmbed'` for backward compatibility
 * with already-stored Tiptap JSON documents.
 */
export function createTiptapExtensions({ placeholder }: CreateExtensionsOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-primary underline' },
    }),
    Placeholder.configure({
      placeholder,
    }),
    ResizableImage.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: IMAGE_CLASS,
      },
    }),
    Youtube.extend({
      name: 'youtube',
      addAttributes() {
        return {
          src: { default: null },
          start: { default: 0 },
          width: { default: 640 },
          height: { default: 480 },
        };
      },
      renderHTML({ HTMLAttributes }) {
        const src = HTMLAttributes.src as string | null;
        if (!src) {
          return ['div', { 'data-youtube-video': '' }];
        }
        const videoId = extractYouTubeVideoId(src);
        if (!videoId) {
          return ['div', { 'data-youtube-video': '' }];
        }
        return [
          'div',
          { 'data-youtube-video': '' },
          [
            'iframe',
            {
              src: `https://www.youtube-nocookie.com/embed/${videoId}`,
              width: '640',
              height: '480',
              allowfullscreen: 'true',
            },
          ],
        ];
      },
      addNodeView() {
        return ReactNodeViewRenderer(YoutubeNodeView);
      },
    }).configure({
      inline: false,
      nocookie: true,
    }),
    XEmbed.extend({
      addNodeView() {
        return ReactNodeViewRenderer(XEmbedNodeView);
      },
    }),
  ];
}
