export type SvgPathData = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  fillRule?: "nonzero" | "evenodd";
};

export type SvgCircleData = {
  cx: string;
  cy: string;
  r: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
};

export type SvgGroupData = {
  fill?: string;
  fillRule?: "nonzero" | "evenodd";
  stroke?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  strokeWidth?: string;
};

export type SvgElement =
  | ({ type: "path" } & SvgPathData)
  | ({ type: "circle" } & SvgCircleData)
  | ({ type: "group"; children: SvgElement[] } & SvgGroupData);

// Re-exported so existing importers keep working; the canonical `"w" | "b"`
// union lives in `@blindfold-chess/types`.
export type { PieceColor } from "@blindfold-chess/types";

export type PieceSvgData = {
  viewBox: string;
  elements: SvgElement[];
};

export type SpinnerSvgData = {
  viewBox: string;
  circle: SvgCircleData & { opacity: number };
  path: SvgPathData & { opacity: number };
};

export type StrokeIconSvgData = {
  viewBox: string;
  strokeWidth: string;
  strokeLinecap: "butt" | "round" | "square";
  strokeLinejoin: "miter" | "round" | "bevel";
  paths: string[];
};

export type RatingFaceLevel = 1 | 2 | 3 | 4 | 5;

export type RatingFaceSvgData = {
  viewBox: string;
  elements: SvgElement[];
};

export type CoinSvgData = {
  viewBox: string;
  elements: SvgElement[];
};
