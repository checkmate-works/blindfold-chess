import type { SVGProps } from "react";

import { getPieceData } from "../../data/chess-pieces";
import { flagData } from "../../data/flag";
import { spinnerData } from "../../data/spinner";
import type { SvgElement, StrokeIconSvgData } from "../../data/types";
import { undoData } from "../../data/undo";
import type {
  ChessPieceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";

function renderElement(element: SvgElement, index: number): React.ReactNode {
  if (element.type === "circle") {
    const { type: _type, ...attrs } = element;
    return <circle key={index} {...attrs} />;
  }
  if (element.type === "path") {
    const { type: _type, ...attrs } = element;
    return <path key={index} {...attrs} />;
  }
  const { type: _type, children, ...attrs } = element;
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

type WebStrokeIconProps = StrokeIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

function createStrokeIcon(data: StrokeIconSvgData, displayName: string) {
  function Icon({
    size = 24,
    color = "currentColor",
    className,
    ...rest
  }: WebStrokeIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={data.viewBox}
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={data.strokeWidth}
        strokeLinecap={data.strokeLinecap}
        strokeLinejoin={data.strokeLinejoin}
        className={className}
        {...rest}
      >
        {data.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const UndoIcon = createStrokeIcon(undoData, "UndoIcon");
export const FlagIcon = createStrokeIcon(flagData, "FlagIcon");

export type {
  ChessPieceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";
export type { PieceType } from "../../data/chess-pieces";
export type { PieceColor } from "../../data/types";
