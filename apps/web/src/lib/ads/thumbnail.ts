/**
 * The thumbnail every native creative carries, and the defaults a creative's
 * images start with.
 *
 * A leaf module on purpose. The DB schema (`@/lib/db/schema/notifications`)
 * imports {@link DEFAULT_NATIVE_THUMBNAIL_FEN} for the `thumbnail_fen` column
 * default, and drizzle-kit loads that schema on its own, so nothing here may
 * pull in `@/config`, React, or anything that reads the environment.
 */

/**
 * The board a creative shows until the admin sets one — Ruy Lopez after
 * 3. Bb5, a recognizable, on-topic opening. It is the column default, so a
 * row inserted with no thumbnail (a seed, a hand-written row) renders this
 * board rather than nothing.
 */
export const DEFAULT_NATIVE_THUMBNAIL_FEN =
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

/**
 * The alt text a creative's image starts with. The forms prefill it, and the
 * image upload route writes it when an image lands on a row that has no alt
 * yet — an image and its alt are stored as a pair, and the row constraint
 * forbids one without the other.
 */
export const DEFAULT_AD_ALT = 'Advertisement';

/**
 * A creative's thumbnail as the renderers take it. A board `fen` is always
 * present (the fallback); an uploaded `imagePath` overrides the board when
 * set, and removing the image reveals the board again.
 */
export type NativeCardThumbnail = {
  fen: string;
  imagePath?: string | null;
  imageAlt?: string;
};

/** The three `ad_creatives` columns a thumbnail is stored across. */
export type ThumbnailColumns = {
  thumbnailFen: string;
  thumbnailImagePath: string | null;
  thumbnailImageAlt: string | null;
};

/** The stored columns as the renderers' shape. */
export function thumbnailFromColumns(row: ThumbnailColumns): NativeCardThumbnail {
  if (row.thumbnailImagePath) {
    return {
      fen: row.thumbnailFen,
      imagePath: row.thumbnailImagePath,
      imageAlt: row.thumbnailImageAlt ?? '',
    };
  }
  return { fen: row.thumbnailFen };
}

/**
 * The renderers' shape as the stored columns. A blank `fen` falls back to the
 * default board, and the alt is stored only alongside an image, which is what
 * the row constraint requires.
 */
export function thumbnailToColumns(thumbnail: NativeCardThumbnail): ThumbnailColumns {
  const fen = thumbnail.fen.trim() || DEFAULT_NATIVE_THUMBNAIL_FEN;
  if (thumbnail.imagePath) {
    return {
      thumbnailFen: fen,
      thumbnailImagePath: thumbnail.imagePath,
      thumbnailImageAlt: thumbnail.imageAlt ?? DEFAULT_AD_ALT,
    };
  }
  return { thumbnailFen: fen, thumbnailImagePath: null, thumbnailImageAlt: null };
}
