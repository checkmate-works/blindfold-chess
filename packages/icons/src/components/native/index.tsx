import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { createIconRenderer } from "../_shared/create-icon-renderer";
import type {
  ChessPieceIconProps,
  CoinIconProps,
  RatingFaceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";

const factory = createIconRenderer({
  Svg,
  Circle,
  Path,
  G,
});

type NativeSpinnerIconProps = SpinnerIconProps & {
  style?: StyleProp<ViewStyle>;
};

type NativeChessPieceIconProps = ChessPieceIconProps & {
  style?: StyleProp<ViewStyle>;
};

type NativeStrokeIconProps = StrokeIconProps & {
  style?: StyleProp<ViewStyle>;
};

type NativeRatingFaceIconProps = RatingFaceIconProps & {
  style?: StyleProp<ViewStyle>;
};

type NativeCoinIconProps = CoinIconProps & {
  style?: StyleProp<ViewStyle>;
};

export const SpinnerIcon = factory.SpinnerIcon as (
  props: NativeSpinnerIconProps,
) => ReturnType<typeof factory.SpinnerIcon>;
export const ChessPieceIcon = factory.ChessPieceIcon as (
  props: NativeChessPieceIconProps,
) => ReturnType<typeof factory.ChessPieceIcon>;
export const RatingFaceIcon = factory.RatingFaceIcon as (
  props: NativeRatingFaceIconProps,
) => ReturnType<typeof factory.RatingFaceIcon>;
export const CoinIcon = factory.CoinIcon as (
  props: NativeCoinIconProps,
) => ReturnType<typeof factory.CoinIcon>;
export const UndoIcon = factory.UndoIcon as (
  props: NativeStrokeIconProps,
) => ReturnType<typeof factory.UndoIcon>;
export const FlagIcon = factory.FlagIcon as (
  props: NativeStrokeIconProps,
) => ReturnType<typeof factory.FlagIcon>;

export type {
  ChessPieceIconProps,
  CoinIconProps,
  RatingFaceIconProps,
  SpinnerIconProps,
  StrokeIconProps,
} from "../types";
export type { PieceType } from "../../data/chess-pieces";
export type { PieceColor, RatingFaceLevel } from "../../data/types";
