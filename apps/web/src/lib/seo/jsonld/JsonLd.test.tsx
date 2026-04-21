import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './JsonLd';

/**
 * `<script type="application/ld+json">` embeds JSON directly into the HTML,
 * which means any `</script>` inside the payload would close the tag and
 * permit arbitrary script injection. `JSON.stringify` does NOT escape `<`,
 * U+2028, or U+2029, so `JsonLd` must do so itself.
 */
describe('JsonLd', () => {
  it('escapes `<` so a payload containing `</script>` cannot close the tag', () => {
    const html = renderToStaticMarkup(<JsonLd data={{ evil: '</script><img src=x>' }} />);

    // The raw `</script>` substring must not appear inside the script body;
    // the literal `<` from the payload must be rewritten as its Unicode escape.
    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain('</script><img');
  });

  it('escapes U+2028 and U+2029 line/paragraph separators', () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ ls: 'before\u2028after', ps: 'before\u2029after' }} />
    );

    expect(html).not.toMatch(/\u2028/);
    expect(html).not.toMatch(/\u2029/);
    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('preserves the structured data for normal payloads', () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shingan' }} />
    );

    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"name":"Shingan"');
  });
});
