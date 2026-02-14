import type { SVGProps } from "react";

import { getPieceData } from "../../data/chess-pieces";
import { spinnerData } from "../../data/spinner";
import type { SvgElement } from "../../data/types";
import type { ChessPieceIconProps, SpinnerIconProps } from "../types";

function renderElement(element: SvgElement, index: number): React.ReactNode {
  if (element.type === "circle") {
    const { type, ...attrs } = element;
    void type;
    return <circle key={index} {...attrs} />;
  }
  if (element.type === "path") {
    const { type, ...attrs } = element;
    void type;
    return <path key={index} {...attrs} />;
  }
  const { type, children, ...attrs } = element;
  void type;
  return (
    <g key={index} {...attrs}>
      {children.map((child, i) => renderElement(child, i))}
    </g>
  );
}

type WebSpinnerIconProps = SpinnerIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

export function SpinnerIcon({
  size = 24,
  color = "currentColor",
  className,
  ...rest
}: WebSpinnerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={spinnerData.viewBox}
      width={size}
      height={size}
      fill="none"
      className={className}
      {...rest}
    >
      <circle
        cx={spinnerData.circle.cx}
        cy={spinnerData.circle.cy}
        r={spinnerData.circle.r}
        stroke={color}
        strokeWidth={spinnerData.circle.strokeWidth}
        opacity={spinnerData.circle.opacity}
      />
      <path
        d={spinnerData.path.d}
        fill={color}
        opacity={spinnerData.path.opacity}
      />
    </svg>
  );
}

type WebChessPieceIconProps = ChessPieceIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children" | "type" | "color">;

export function ChessPieceIcon({
  type,
  color,
  size = 45,
  className,
  ...rest
}: WebChessPieceIconProps) {
  const data = getPieceData(type, color);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={data.viewBox}
      width={size}
      height={size}
      className={className}
      {...rest}
    >
      {data.elements.map((el, i) => renderElement(el, i))}
    </svg>
  );
}

export type { ChessPieceIconProps, SpinnerIconProps } from "../types";
export type { PieceType } from "../../data/chess-pieces";
export type { PieceColor } from "../../data/types";
