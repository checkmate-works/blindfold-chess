import type { ElementType, ReactNode } from "react";

import { getPieceData } from "../../data/chess-pieces";
import { coinData } from "../../data/coin";
import { flagData } from "../../data/flag";
import { getRatingFaceData } from "../../data/rating-faces";
import { spinnerData } from "../../data/spinner";
import type { SvgElement, StrokeIconSvgData } from "../../data/types";
import { undoData } from "../../data/undo";
import type {
  ChessPieceIconProps,
  CoinIconProps,
  RatingFaceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";

/**
 * Generic platform-extra props that the consumer may pass alongside the
 * shared icon shape. The web renderer uses `className` and arbitrary
 * SVG attributes; the native renderer uses `style`. The factory does not
 * inspect this object — it simply forwards it to the container element.
 */
export type ContainerExtras = Record<string, unknown>;

export type IconPrimitives = {
  Svg: ElementType;
  Circle: ElementType;
  Path: ElementType;
  G: ElementType;
  /**
   * Whether to emit the `xmlns="http://www.w3.org/2000/svg"` attribute on the
   * root `<Svg>` element. Required for inline SVG in HTML (web), but should
   * be omitted on `react-native-svg` where the attribute is meaningless and
   * silently ignored by v15. Defaults to `false`.
   */
  passXmlns?: boolean;
};

export function createIconRenderer(primitives: IconPrimitives) {
  const { Svg, Circle, Path, G, passXmlns = false } = primitives;
  const xmlnsProps = passXmlns ? { xmlns: "http://www.w3.org/2000/svg" } : {};

  function renderElement(element: SvgElement, index: number): ReactNode {
    if (element.type === "circle") {
      const { type: _type, ...attrs } = element;
      return <Circle key={index} {...attrs} />;
    }
    if (element.type === "path") {
      const { type: _type, ...attrs } = element;
      return <Path key={index} {...attrs} />;
    }
    const { type: _type, children, ...attrs } = element;
    return (
      <G key={index} {...attrs}>
        {children.map((child, i) => renderElement(child, i))}
      </G>
    );
  }

  function SpinnerIcon({
    size = 24,
    color = "currentColor",
    ...extras
  }: SpinnerIconProps & ContainerExtras) {
    return (
      <Svg
        {...xmlnsProps}
        viewBox={spinnerData.viewBox}
        width={size}
        height={size}
        fill="none"
        {...extras}
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

  function ChessPieceIcon({
    type,
    color,
    size = 45,
    ...extras
  }: ChessPieceIconProps & ContainerExtras) {
    const data = getPieceData(type, color);

    return (
      <Svg
        {...xmlnsProps}
        viewBox={data.viewBox}
        width={size}
        height={size}
        {...extras}
      >
        {data.elements.map((el, i) => renderElement(el, i))}
      </Svg>
    );
  }

  function createStrokeIcon(data: StrokeIconSvgData, displayName: string) {
    function Icon({
      size = 24,
      color = "currentColor",
      ...extras
    }: StrokeIconProps & ContainerExtras) {
      return (
        <Svg
          {...xmlnsProps}
          viewBox={data.viewBox}
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth={data.strokeWidth}
          strokeLinecap={data.strokeLinecap}
          strokeLinejoin={data.strokeLinejoin}
          {...extras}
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

  function RatingFaceIcon({
    level,
    size = 24,
    faceColor,
    ...extras
  }: RatingFaceIconProps & ContainerExtras) {
    const data = getRatingFaceData(level, faceColor);

    return (
      <Svg
        {...xmlnsProps}
        viewBox={data.viewBox}
        width={size}
        height={size}
        {...extras}
      >
        {data.elements.map((el, i) => renderElement(el, i))}
      </Svg>
    );
  }

  function CoinIcon({ size = 24, ...extras }: CoinIconProps & ContainerExtras) {
    return (
      <Svg
        {...xmlnsProps}
        viewBox={coinData.viewBox}
        width={size}
        height={size}
        {...extras}
      >
        {coinData.elements.map((el, i) => renderElement(el, i))}
      </Svg>
    );
  }

  const UndoIcon = createStrokeIcon(undoData, "UndoIcon");
  const FlagIcon = createStrokeIcon(flagData, "FlagIcon");

  return {
    SpinnerIcon,
    ChessPieceIcon,
    RatingFaceIcon,
    CoinIcon,
    UndoIcon,
    FlagIcon,
    createStrokeIcon,
  };
}
