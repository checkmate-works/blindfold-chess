import type { GuideArrow } from "./GuideBoard";

/** 0-based file index of a square name: a → 0 … h → 7. */
export function fileIndexOf(square: string): number {
  return square.charCodeAt(0) - 97;
}

/** The rank number of a square name: "e4" → 4. */
export function rankOf(square: string): number {
  return Number(square.slice(1));
}

/** a1 is dark, h1 light: a square is light when file index + rank is even. */
export function isLightGuideSquare(square: string): boolean {
  return (fileIndexOf(square) + rankOf(square)) % 2 === 0;
}

/**
 * A square's top-left corner in the web's 0–100 board space, White at the
 * bottom (a8 is 0,0; h1 is 87.5,87.5).
 */
export function squareOrigin(square: string): { x: number; y: number } {
  return { x: fileIndexOf(square) * 12.5, y: (8 - rankOf(square)) * 12.5 };
}

/** The centre of a square in the same space. */
export function squareCentre(square: string): { x: number; y: number } {
  const { x, y } = squareOrigin(square);
  return { x: x + 6.25, y: y + 6.25 };
}

/**
 * The squares from `from` to `to` along a straight or diagonal line, both
 * ends included.
 */
export function squaresBetween(from: string, to: string): string[] {
  const df = Math.sign(fileIndexOf(to) - fileIndexOf(from));
  const dr = Math.sign(rankOf(to) - rankOf(from));
  const steps = Math.max(
    Math.abs(fileIndexOf(to) - fileIndexOf(from)),
    Math.abs(rankOf(to) - rankOf(from)),
  );
  return Array.from(
    { length: steps + 1 },
    (_, i) =>
      `${String.fromCharCode(97 + fileIndexOf(from) + df * i)}${rankOf(from) + dr * i}`,
  );
}

const STEPS = {
  k: [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ],
  n: [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ],
  b: [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ],
  r: [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ],
} as const;

/**
 * The squares a lone piece on `square` reaches on an otherwise empty board:
 * what the 4kyu movement boards dot. The king and knight take one step; the
 * bishop, rook and queen slide to the edge.
 */
export function pieceReach(
  piece: "k" | "n" | "b" | "r" | "q",
  square: string,
): string[] {
  const steps = piece === "q" ? [...STEPS.b, ...STEPS.r] : STEPS[piece];
  const slides = piece === "b" || piece === "r" || piece === "q";
  const out: string[] = [];
  for (const [df, dr] of steps) {
    let f = fileIndexOf(square) + df;
    let r = rankOf(square) + dr;
    while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
      out.push(`${String.fromCharCode(97 + f)}${r}`);
      if (!slides) break;
      f += df;
      r += dr;
    }
  }
  return out;
}

/**
 * The web's diagonal-table arrows: a line 1.2 wide at 70% from centre to
 * centre, its 4 × 3 marker (in stroke widths) with the tip half a unit past
 * the end square's centre.
 */
export function tableArrow(from: string, to: string): GuideArrow {
  const a = squareCentre(from);
  const b = squareCentre(to);
  return {
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    color: "#10b981",
    strokeWidth: 1.2,
    opacity: 0.7,
    headLength: 4 * 1.2,
    headWidth: 3 * 1.2,
    tipOffset: 0.5 * 1.2,
  };
}
