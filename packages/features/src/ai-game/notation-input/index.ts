export type {
  CastlingToken,
  NotationChar,
  NotationInputAction,
  NotationInputState,
  PromotionPiece,
} from "./types";
export { MAX_NOTATION_INPUT_LENGTH } from "./types";
export {
  computeIsPawnCaptureMode,
  computeIsSubmittable,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "./state-machine";
export type {
  UseNotationInputOptions,
  UseNotationInputReturn,
} from "./use-notation-input";
