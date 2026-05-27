import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './JsonLd';

/**
 * `<script type="application/ld+json">` embeds JSON directly into the HTML,
 * which means any `</script>` inside the payload would close the tag and
 * permit arbitrary script injection. `JSON.stringify` does NOT escape `<`,
 * U+2028, or U+2029, so `JsonLd` must do so itself.
 *
 * `JsonLd` is a synchronous client-safe component: it accepts the per-request
 * CSP nonce as a prop (rather than reading `next/headers`) so Client
 * Components can import it without dragging `next/headers` into the client
 * bundle. Server Component callers resolve the nonce via `resolveCspNonce()`
 * (`@/lib/security/nonce`) and forward it here.
 */

describe('JsonLd', () => {
  it('escapes `<` so a payload containing `</script>` cannot close the tag', () => {
    const element = JsonLd({ data: { evil: '</script><img src=x>' }, nonce: 'n' });
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
      nonce: 'n',
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('preserves the structured data for normal payloads', () => {
    const element = JsonLd({
      data: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shingan' },
      nonce: 'n',
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"name":"Shingan"');
  });

  it('attaches the provided CSP nonce as the `nonce` attribute', () => {
    const element = JsonLd({ data: { ok: true }, nonce: 'test-nonce' });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('nonce="test-nonce"');
  });

  it('omits the `nonce` attribute when no nonce is supplied', () => {
    const element = JsonLd({ data: { ok: true } });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain('nonce=');
  });
});
