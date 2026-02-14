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

export type PieceColor = "w" | "b";

export type PieceSvgData = {
  viewBox: string;
  elements: SvgElement[];
};

export type SpinnerSvgData = {
  viewBox: string;
  circle: SvgCircleData & { opacity: number };
  path: SvgPathData & { opacity: number };
};
