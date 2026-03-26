import { Node, mergeAttributes } from '@tiptap/core';

export interface TwitterEmbedOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    twitterEmbed: {
      setTwitterEmbed: (options: { tweetId: string; url: string }) => ReturnType;
    };
  }
}

export const TwitterEmbed = Node.create<TwitterEmbedOptions>({
  name: 'twitterEmbed',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tweetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tweet-id'),
        renderHTML: (attributes) => ({
          'data-tweet-id': attributes.tweetId,
        }),
      },
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tweet-url'),
        renderHTML: (attributes) => ({
          'data-tweet-url': attributes.url,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-tweet-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'twitter-embed-placeholder',
      }),
      [
        'div',
        { class: 'twitter-embed-content' },
        ['span', { class: 'twitter-embed-icon' }, '𝕏'],
        [
          'a',
          {
            href: HTMLAttributes['data-tweet-url'] ?? '',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          HTMLAttributes['data-tweet-url'] ?? `Tweet ID: ${HTMLAttributes['data-tweet-id']}`,
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setTwitterEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
