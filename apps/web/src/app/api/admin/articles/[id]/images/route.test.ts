import { describe, expect, it } from 'vitest';

import { validateBinarySignature } from './image-validation';

describe('validateBinarySignature', () => {
  it('should validate JPEG binary signature', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/jpeg')).toBe(true);
  });

  it('should reject non-JPEG data with image/jpeg type', () => {
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(pngBuffer, 'image/jpeg')).toBe(false);
  });

  it('should validate PNG binary signature', () => {
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(pngBuffer, 'image/png')).toBe(true);
  });

  it('should reject non-PNG data with image/png type', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/png')).toBe(false);
  });

  it('should validate WebP binary signature', () => {
    // RIFF....WEBP
    const webpBuffer = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]).buffer;
    expect(validateBinarySignature(webpBuffer, 'image/webp')).toBe(true);
  });

  it('should reject non-WebP data with image/webp type', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/webp')).toBe(false);
  });

  // SVG is intentionally not supported — can embed <script>/event handlers and execute
  // when the *.supabase.co URL is opened directly. See image-validation.ts TSDoc.
  it('should reject SVG with <svg tag even when declared as image/svg+xml', () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const encoder = new TextEncoder();
    const svgBuffer = encoder.encode(svgContent).buffer;
    expect(validateBinarySignature(svgBuffer, 'image/svg+xml')).toBe(false);
  });

  it('should reject SVG with <?xml declaration when declared as image/svg+xml', () => {
    const svgContent = '<?xml version="1.0"?><svg></svg>';
    const encoder = new TextEncoder();
    const svgBuffer = encoder.encode(svgContent).buffer;
    expect(validateBinarySignature(svgBuffer, 'image/svg+xml')).toBe(false);
  });

  it('should reject binary data with image/svg+xml type', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/svg+xml')).toBe(false);
  });

  it('should reject unsupported MIME types', () => {
    const buffer = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(buffer, 'application/pdf')).toBe(false);
  });

  it('should reject empty buffer for JPEG', () => {
    const buffer = new ArrayBuffer(0);
    expect(validateBinarySignature(buffer, 'image/jpeg')).toBe(false);
  });

  it('should reject truncated JPEG header (only 2 bytes)', () => {
    const buffer = new Uint8Array([0xff, 0xd8]).buffer;
    // Third byte is undefined/0 which doesn't match 0xff prefix
    expect(validateBinarySignature(buffer, 'image/jpeg')).toBe(false);
  });

  // --- Additional edge cases (Tester) ---

  // MIME type vs binary signature mismatch cases
  it('should reject PNG binary data declared as image/jpeg', () => {
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(pngBuffer, 'image/jpeg')).toBe(false);
  });

  it('should reject JPEG binary data declared as image/png', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/png')).toBe(false);
  });

  it('should reject JPEG binary data declared as image/webp', () => {
    const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(validateBinarySignature(jpegBuffer, 'image/webp')).toBe(false);
  });

  it('should reject WebP binary data declared as image/jpeg', () => {
    const webpBuffer = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]).buffer;
    expect(validateBinarySignature(webpBuffer, 'image/jpeg')).toBe(false);
  });

  // Minimum valid header boundary tests
  it('should accept exactly 3-byte JPEG header (FF D8 FF)', () => {
    const buffer = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    expect(validateBinarySignature(buffer, 'image/jpeg')).toBe(true);
  });

  it('should accept exactly 4-byte PNG header (89 50 4E 47)', () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    expect(validateBinarySignature(buffer, 'image/png')).toBe(true);
  });

  // Empty buffer for all types
  it('should reject empty buffer for PNG', () => {
    const buffer = new ArrayBuffer(0);
    expect(validateBinarySignature(buffer, 'image/png')).toBe(false);
  });

  it('should reject empty buffer for WebP', () => {
    const buffer = new ArrayBuffer(0);
    expect(validateBinarySignature(buffer, 'image/webp')).toBe(false);
  });

  it('should reject empty buffer declared as image/svg+xml', () => {
    const buffer = new ArrayBuffer(0);
    expect(validateBinarySignature(buffer, 'image/svg+xml')).toBe(false);
  });

  // Truncated headers for PNG and WebP
  it('should reject truncated PNG header (only 3 bytes)', () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4e]).buffer;
    expect(validateBinarySignature(buffer, 'image/png')).toBe(false);
  });

  it('should reject truncated WebP buffer (only 8 bytes, missing WEBP marker)', () => {
    const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]).buffer;
    expect(validateBinarySignature(buffer, 'image/webp')).toBe(false);
  });

  // SVG is rejected regardless of content — the MIME type itself is no longer accepted.
  it('should reject SVG containing <script> tag (MIME type is not allowed at all)', () => {
    const svgContent =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';
    const encoder = new TextEncoder();
    const svgBuffer = encoder.encode(svgContent).buffer;
    expect(validateBinarySignature(svgBuffer, 'image/svg+xml')).toBe(false);
  });

  it('should reject SVG with <!DOCTYPE declaration (MIME type is not allowed at all)', () => {
    const svgContent =
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg></svg>';
    const encoder = new TextEncoder();
    const svgBuffer = encoder.encode(svgContent).buffer;
    expect(validateBinarySignature(svgBuffer, 'image/svg+xml')).toBe(false);
  });

  it('should reject HTML-like content declared as image/svg+xml', () => {
    const content = '<div>this is not an SVG</div>';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(content).buffer;
    expect(validateBinarySignature(buffer, 'image/svg+xml')).toBe(false);
  });

  // WebP: RIFF header present but WEBP marker corrupted
  it('should reject WebP with valid RIFF but corrupted WEBP marker', () => {
    const buffer = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]).buffer;
    expect(validateBinarySignature(buffer, 'image/webp')).toBe(false);
  });
});
