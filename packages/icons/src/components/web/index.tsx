import type { SVGProps } from "react";

import { createIconRenderer } from "../_shared/create-icon-renderer";
import type {
  ChessPieceIconProps,
  RatingFaceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";

const factory = createIconRenderer({
  Svg: "svg",
  Circle: "circle",
  Path: "path",
  G: "g",
  passXmlns: true,
});

type WebSpinnerIconProps = SpinnerIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

type WebChessPieceIconProps = ChessPieceIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children" | "type" | "color">;

type WebStrokeIconProps = StrokeIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

type WebRatingFaceIconProps = RatingFaceIconProps & {
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

export const SpinnerIcon = factory.SpinnerIcon as (
  props: WebSpinnerIconProps,
) => ReturnType<typeof factory.SpinnerIcon>;
export const ChessPieceIcon = factory.ChessPieceIcon as (
  props: WebChessPieceIconProps,
) => ReturnType<typeof factory.ChessPieceIcon>;
export const RatingFaceIcon = factory.RatingFaceIcon as (
  props: WebRatingFaceIconProps,
) => ReturnType<typeof factory.RatingFaceIcon>;
export const UndoIcon = factory.UndoIcon as (
  props: WebStrokeIconProps,
) => ReturnType<typeof factory.UndoIcon>;
export const FlagIcon = factory.FlagIcon as (
  props: WebStrokeIconProps,
) => ReturnType<typeof factory.FlagIcon>;

export type {
  ChessPieceIconProps,
  RatingFaceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";
export type { PieceType } from "../../data/chess-pieces";
export type { PieceColor, RatingFaceLevel } from "../../data/types";
