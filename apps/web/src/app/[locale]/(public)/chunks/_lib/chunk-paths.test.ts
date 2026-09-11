import { describe, expect, it } from 'vitest';

import { buildChunkCommentHref, buildChunkCommentsTabHref } from './chunk-paths';

describe('buildChunkCommentsTabHref', () => {
  it('opens the Comments tab and lands on the tab bar', () => {
    expect(buildChunkCommentsTabHref('my-chunk')).toBe('/chunks/my-chunk?tab=comments#chunk-tabs');
  });
});

describe('buildChunkCommentHref', () => {
  // The comment tree only mounts under ?tab=comments; without it the anchor
  // has no target on a chunk with linked positions.
  it('carries the comments tab and anchors at the post', () => {
    expect(buildChunkCommentHref('my-chunk', 'post-1')).toBe(
      '/chunks/my-chunk?tab=comments#post-post-1'
    );
  });

  it('prefixes the locale for a server-side redirect', () => {
    expect(buildChunkCommentHref('my-chunk', 'post-1', { locale: 'ja' })).toBe(
      '/ja/chunks/my-chunk?tab=comments#post-post-1'
    );
  });

  // The toast key rides in the query, after the tab param, and the anchor
  // stays last so the fragment is the post itself.
  it('appends the toast key before the anchor', () => {
    expect(
      buildChunkCommentHref('my-chunk', 'reply-9', { locale: 'en', toast: 'post_created' })
    ).toBe('/en/chunks/my-chunk?tab=comments&toast=post_created#post-reply-9');
  });
});
