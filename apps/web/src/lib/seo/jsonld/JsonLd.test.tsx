import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { JsonLd } from './JsonLd';

/**
 * `<script type="application/ld+json">` embeds JSON directly into the HTML,
 * which means any `</script>` inside the payload would close the tag and
 * permit arbitrary script injection. `JSON.stringify` does NOT escape `<`,
 * U+2028, or U+2029, so `JsonLd` must do so itself.
 *
 * `JsonLd` is an async Server Component because it reads the per-request
 * CSP nonce from `next/headers`. Tests mock `next/headers` and `await` the
 * component to get the final React element before handing it to
 * `renderToStaticMarkup`.
 */

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-nonce': 'test-nonce' })),
}));

describe('JsonLd', () => {
  it('escapes `<` so a payload containing `</script>` cannot close the tag', async () => {
    const element = await JsonLd({ data: { evil: '</script><img src=x>' } });
    const html = renderToStaticMarkup(element);

    // The raw `</script>` substring must not appear inside the script body;
    // the literal `<` from the payload must be rewritten as its Unicode escape.
    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain('</script><img');
  });

  it('escapes U+2028 and U+2029 line/paragraph separators', async () => {
    const element = await JsonLd({
      data: { ls: 'before after', ps: 'before after' },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('preserves the structured data for normal payloads', async () => {
    const element = await JsonLd({
      data: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shingan' },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"name":"Shingan"');
  });

  it('attaches the per-request CSP nonce from `x-nonce`', async () => {
    const element = await JsonLd({ data: { ok: true } });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('nonce="test-nonce"');
  });
});
