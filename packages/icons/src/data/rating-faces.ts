import type { RatingFaceLevel, RatingFaceSvgData, SvgElement } from "./types";

const VIEWBOX = "0 0 24 24";
const FACE_FILL = "#9CA3AF";
const DETAIL_COLOR = "#4B5563";

/**
 * The head. MUST stay first in `elements` — `getRatingFaceData` recolors
 * element 0 when a caller passes `faceColor`.
 */
const HEAD: SvgElement = {
  type: "circle",
  cx: "12",
  cy: "12",
  r: "10",
  fill: FACE_FILL,
};

/** Stroke treatment shared by every drawn line (brows, mouths). */
const STROKE = {
  stroke: DETAIL_COLOR,
  strokeWidth: "1.5",
  strokeLinecap: "round",
} as const;

/** Downcast brows, worn only by the unhappiest face. */
const BROWS: SvgElement[] = [
  { type: "path", d: "M8.5 10.5 7 9M9.5 9l-1 1.5", ...STROKE },
  { type: "path", d: "M15.5 10.5 17 9M14.5 9l1 1.5", ...STROKE },
];

/** Neutral dot eyes, worn by every face except the unhappiest. */
const EYES: SvgElement[] = [
  { type: "circle", cx: "9", cy: "10", r: "1.25", fill: DETAIL_COLOR },
  { type: "circle", cx: "15", cy: "10", r: "1.25", fill: DETAIL_COLOR },
];

/**
 * Mouth per level, 1 (unhappiest) → 5 (happiest): a deep frown easing through
 * a flat line at 3 to a broad smile.
 *
 * `curved` drives the `fill: "none"` a stroked curve needs so its chord is not
 * filled. The flat mouth is a straight `h` segment, which encloses no area, so
 * it carries no fill — as it always has.
 */
const MOUTHS: Record<RatingFaceLevel, { d: string; curved: boolean }> = {
  1: { d: "M8 17c1.5-2.5 6.5-2.5 8 0", curved: true },
  2: { d: "M9 16c1.2-1.5 4.8-1.5 6 0", curved: true },
  3: { d: "M9 15h6", curved: false },
  4: { d: "M9 14c1.2 1.5 4.8 1.5 6 0", curved: true },
  5: { d: "M8 14c1.5 2.5 6.5 2.5 8 0", curved: true },
};

/** Only the unhappiest face uses brows instead of dot eyes. */
const BROWED_LEVEL: RatingFaceLevel = 1;

function buildFace(level: RatingFaceLevel): RatingFaceSvgData {
  const mouth = MOUTHS[level];
  return {
    viewBox: VIEWBOX,
    elements: [
      HEAD,
      ...(level === BROWED_LEVEL ? BROWS : EYES),
      {
        type: "path",
        d: mouth.d,
        ...STROKE,
        ...(mouth.curved && { fill: "none" }),
      },
    ],
  };
}

/**
 * SVG data for the rating face at `level`, optionally recolored.
 *
 * `faceColor` replaces the head's fill only, leaving the features in their
 * fixed detail color — which is why the head is element 0 by contract.
 */
export function getRatingFaceData(
  level: RatingFaceLevel,
  faceColor?: string,
): RatingFaceSvgData {
  const data = buildFace(level);
  if (!faceColor) return data;
  return {
    ...data,
    elements: data.elements.map((el, i) =>
      i === 0 ? { ...el, fill: faceColor } : el,
    ),
  };
}
