import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

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
    const { type, ...attrs } = element;
    void type;
    return <Circle key={index} {...attrs} />;
  }
  if (element.type === "path") {
    const { type, ...attrs } = element;
    void type;
    return <Path key={index} {...attrs} />;
  }
  const { type, children, ...attrs } = element;
  void type;
  return (
    <G key={index} {...attrs}>
      {children.map((child, i) => renderElement(child, i))}
    </G>
  );
}

type NativeSpinnerIconProps = SpinnerIconProps & {
  style?: StyleProp<ViewStyle>;
};

export function SpinnerIcon({
  size = 24,
  color = "currentColor",
  style,
}: NativeSpinnerIconProps) {
  return (
    <Svg
      viewBox={spinnerData.viewBox}
      width={size}
      height={size}
      fill="none"
      style={style}
    >
      <Circle
        cx={spinnerData.circle.cx}
        cy={spinnerData.circle.cy}
        r={spinnerData.circle.r}
        stroke={color}
        strokeWidth={spinnerData.circle.strokeWidth}
        opacity={spinnerData.circle.opacity}
      />
      <Path
        d={spinnerData.path.d}
        fill={color}
        opacity={spinnerData.path.opacity}
      />
    </Svg>
  );
}

type NativeChessPieceIconProps = ChessPieceIconProps & {
  style?: StyleProp<ViewStyle>;
};

export function ChessPieceIcon({
  type,
  color,
  size = 45,
  style,
}: NativeChessPieceIconProps) {
  const data = getPieceData(type, color);

  return (
    <Svg viewBox={data.viewBox} width={size} height={size} style={style}>
      {data.elements.map((el, i) => renderElement(el, i))}
    </Svg>
  );
}

type NativeStrokeIconProps = StrokeIconProps & {
  style?: StyleProp<ViewStyle>;
};

function createStrokeIcon(data: StrokeIconSvgData, displayName: string) {
  function Icon({
    size = 24,
    color = "currentColor",
    style,
  }: NativeStrokeIconProps) {
    return (
      <Svg
        viewBox={data.viewBox}
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={data.strokeWidth}
        strokeLinecap={data.strokeLinecap}
        strokeLinejoin={data.strokeLinejoin}
        style={style}
      >
        {data.paths.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </Svg>
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
