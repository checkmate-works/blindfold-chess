import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './JsonLd';

/**
 * `<script type="application/ld+json">` embeds JSON directly into the HTML,
 * which means any `</script>` inside the payload would close the tag and
 * permit arbitrary script injection. `JSON.stringify` does NOT escape `<`,
 * U+2028, or U+2029, so `JsonLd` must do so itself.
 *
 * `JsonLd` is a synchronous client-safe component with no `next/headers`
 * dependency; JSON-LD data blocks are exempt from `script-src`, so it emits
 * no `nonce` attribute (see the docblock in `./JsonLd.tsx`).
 */

describe('JsonLd', () => {
  it('escapes `<` so a payload containing `</script>` cannot close the tag', () => {
    const element = JsonLd({ data: { evil: '</script><img src=x>' } });
    const html = renderToStaticMarkup(element);

    // The raw `</script>` substring must not appear inside the script body;
    // the literal `<` from the payload must be rewritten as its Unicode escape.
    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain('</script><img');
  });

  it('escapes U+2028 and U+2029 line/paragraph separators', () => {
    const element = JsonLd({
      data: {
        ls: `before${String.fromCharCode(0x2028)}after`,
        ps: `before${String.fromCharCode(0x2029)}after`,
      },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('preserves the structured data for normal payloads', () => {
    const element = JsonLd({
      data: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shingan' },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"name":"Shingan"');
  });

  it('emits no `nonce` attribute — data blocks are exempt from script-src', () => {
    // Threading a nonce here would require a `headers()` read in every
    // calling Server Component, forcing otherwise-static pages dynamic.
    const element = JsonLd({ data: { ok: true } });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain('nonce=');
  });
});
