import { describe, expect, it } from 'vitest';

import { validateImageBinarySignature } from './binary-signature';

/**
 * Merged from the two suites that existed while this check was implemented
 * twice: the admin-image cases (formerly
 * `app/api/admin/articles/[id]/images/route.test.ts`) and the post-image
 * cases (formerly in `lib/post-images/validation.test.ts`).
 *
 * Two of the admin cases asserted the weaker behavior the admin copy had —
 * a PNG accepted on its first 4 bytes alone. They are kept below, inverted,
 * so the suite records that the partial header is now rejected rather than
 * quietly losing the case.
 */
function bufferOf(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

describe('validateImageBinarySignature', () => {
  describe('JPEG', () => {
    it('accepts a buffer starting with FF D8 FF', () => {
      expect(validateImageBinarySignature(bufferOf(JPEG), 'image/jpeg')).toBe(true);
    });

    it('accepts exactly the 3 signature bytes', () => {
      expect(validateImageBinarySignature(bufferOf([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true);
    });

    it('rejects a truncated 2-byte header', () => {
      expect(validateImageBinarySignature(bufferOf([0xff, 0xd8]), 'image/jpeg')).toBe(false);
    });

    it('rejects an empty buffer', () => {
      expect(validateImageBinarySignature(new ArrayBuffer(0), 'image/jpeg')).toBe(false);
    });
  });

  describe('PNG', () => {
    it('accepts the full 8-byte signature', () => {
      expect(validateImageBinarySignature(bufferOf(PNG), 'image/png')).toBe(true);
    });

    // Was "should accept exactly 4-byte PNG header (89 50 4E 47)" in the admin
    // suite. The 4-byte prefix is no longer sufficient.
    it('rejects a 4-byte header carrying only the PNG prefix', () => {
      expect(validateImageBinarySignature(bufferOf([0x89, 0x50, 0x4e, 0x47]), 'image/png')).toBe(
        false
      );
    });

    // Was "should validate PNG binary signature" in the admin suite — the
    // prefix followed by zeroes instead of the CR LF SUB LF trailer.
    it('rejects the PNG prefix followed by zeroed trailer bytes', () => {
      expect(
        validateImageBinarySignature(
          bufferOf([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0]),
          'image/png'
        )
      ).toBe(false);
    });

    it('rejects a truncated 3-byte header', () => {
      expect(validateImageBinarySignature(bufferOf([0x89, 0x50, 0x4e]), 'image/png')).toBe(false);
    });

    it('rejects an empty buffer', () => {
      expect(validateImageBinarySignature(new ArrayBuffer(0), 'image/png')).toBe(false);
    });
  });

  describe('WebP', () => {
    it('accepts RIFF....WEBP', () => {
      expect(validateImageBinarySignature(bufferOf(WEBP), 'image/webp')).toBe(true);
    });

    // The admin copy checked only the trailing WEBP marker, so this passed.
    it('rejects a buffer carrying the WEBP marker without the leading RIFF', () => {
      expect(
        validateImageBinarySignature(
          bufferOf([0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
          'image/webp'
        )
      ).toBe(false);
    });

    it('rejects a valid RIFF with a corrupted WEBP marker (an AVI container)', () => {
      expect(
        validateImageBinarySignature(
          bufferOf([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]),
          'image/webp'
        )
      ).toBe(false);
    });

    it('rejects a truncated 8-byte buffer missing the WEBP marker', () => {
      expect(
        validateImageBinarySignature(
          bufferOf([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
          'image/webp'
        )
      ).toBe(false);
    });

    it('rejects an empty buffer', () => {
      expect(validateImageBinarySignature(new ArrayBuffer(0), 'image/webp')).toBe(false);
    });
  });

  describe('cross-MIME spoofing', () => {
    it.each([
      ['PNG bytes declared as image/jpeg', PNG, 'image/jpeg'],
      ['WebP bytes declared as image/jpeg', WEBP, 'image/jpeg'],
      ['JPEG bytes declared as image/png', JPEG, 'image/png'],
      ['JPEG bytes declared as image/webp', JPEG, 'image/webp'],
    ] as const)('rejects %s', (_label, bytes, declaredType) => {
      expect(validateImageBinarySignature(bufferOf([...bytes]), declaredType)).toBe(false);
    });
  });

  describe('SVG is never accepted', () => {
    it.each([
      ['a plain <svg> document', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['an <?xml?>-prefixed document', '<?xml version="1.0"?><svg></svg>'],
      [
        'a document embedding <script>',
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>',
      ],
      [
        'a <!DOCTYPE>-prefixed document',
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg></svg>',
      ],
      ['HTML that is not SVG at all', '<div>this is not an SVG</div>'],
    ])('rejects %s', (_label, content) => {
      const buffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
      expect(validateImageBinarySignature(buffer, 'image/svg+xml')).toBe(false);
    });

    it('rejects valid JPEG bytes declared as image/svg+xml', () => {
      expect(validateImageBinarySignature(bufferOf(JPEG), 'image/svg+xml')).toBe(false);
    });

    it('rejects an empty buffer declared as image/svg+xml', () => {
      expect(validateImageBinarySignature(new ArrayBuffer(0), 'image/svg+xml')).toBe(false);
    });
  });

  it('rejects a MIME type with no branch at all', () => {
    expect(validateImageBinarySignature(bufferOf(JPEG), 'application/pdf')).toBe(false);
  });
});
