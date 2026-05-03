import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import { stripExifAndApplyOrientation } from './sharp-helpers';

vi.mock('server-only', () => ({}));

/**
 * Regression test for the EXIF-GPS-leak bug fixed in this PR.
 *
 * Why this lives in a separate file from `sharp-helpers.test.ts`:
 *   The other file mocks the entire `sharp` module so the unit tests can
 *   probe pure metadata. THIS file exercises the REAL `sharp` against a
 *   buffer containing real GPS EXIF, which is the whole point — a mock
 *   cannot prove the strip behavior.
 *
 * What this guards against:
 *   The previous implementation called `.withMetadata({})`, which (per
 *   Sharp's docs) actually PRESERVES most metadata (EXIF, XMP, IPTC).
 *   That was a real production-grade GPS leak. The fix is to omit
 *   `.withMetadata()` / `.keepMetadata()` entirely so Sharp's documented
 *   strip-by-default behavior takes over. This test would FAIL on the
 *   pre-fix code and PASS on the post-fix code.
 */
describe('stripExifAndApplyOrientation — EXIF strip regression (real sharp)', () => {
  /**
   * Build a small JPEG buffer carrying real EXIF metadata. We'd love to
   * embed actual GPS tags here (the bug was specifically about GPS
   * leaking), but Sharp 0.34's `withExif` / `withExifMerge` pipeline
   * doesn't reliably round-trip a GPS IFD on a freshly synthesized
   * `create` source — it emits IFD0/Exif/Interop blocks but drops the
   * GPS sub-IFD.
   *
   * What we CAN reliably synthesize is an arbitrary IFD0 tag (e.g.
   * `Software`). Stripping that is observable via `metadata.exif === undefined`.
   * GPS tags travel through the same EXIF block, so a test that proves
   * "the EXIF block is gone" is a sufficient regression for the bug:
   * the broken code (`.withMetadata({})`) preserves EXIF wholesale,
   * the fixed code (no `.withMetadata` call) drops it wholesale.
   */
  async function buildJpegWithExif(): Promise<Buffer> {
    const baseJpeg = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    // Re-encode with explicit EXIF. Sharp 0.34's `withExif` typing exposes
    // only IFD0/IFD1/IFD2/IFD3 directories — there is no `GPS` key in the
    // declared type. The IFD0 `Software` tag is sufficient to prove the
    // strip behavior because GPS lat/long would be embedded in the same
    // EXIF block; if `metadata.exif === undefined` after stripping, no
    // EXIF tag of any kind survived.
    return sharp(baseJpeg)
      .withExif({
        IFD0: {
          Software: 'blindfold-chess-test-fixture',
        },
      })
      .jpeg()
      .toBuffer();
  }

  it('fixture JPEG actually carries an EXIF block (sanity check)', async () => {
    const fixture = await buildJpegWithExif();
    const meta = await sharp(fixture).metadata();
    // Without this, the strip-test below would be vacuous.
    expect(meta.exif).toBeDefined();
    expect(meta.exif).toBeInstanceOf(Buffer);
    expect((meta.exif as Buffer).includes(Buffer.from('blindfold-chess-test-fixture'))).toBe(true);
  });

  it('produces an output buffer with NO EXIF block — proves GPS cannot leak', async () => {
    const fixture = await buildJpegWithExif();

    const stripped = await stripExifAndApplyOrientation({
      buffer: fixture,
      contentType: 'image/jpeg',
    });

    const meta = await sharp(stripped).metadata();
    // Sharp reports `exif` as undefined when no EXIF block is present in
    // the buffer. This assertion FAILS on the previous (broken) code,
    // which called `.withMetadata({})` and preserved EXIF wholesale,
    // and PASSES on the fixed code, which omits `.withMetadata()` so
    // Sharp's strip-by-default behavior takes effect. Because GPS tags
    // are stored INSIDE the EXIF block, "no EXIF block" implies "no GPS".
    expect(meta.exif).toBeUndefined();
  });
});
