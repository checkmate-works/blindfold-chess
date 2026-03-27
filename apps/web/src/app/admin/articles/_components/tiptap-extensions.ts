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
