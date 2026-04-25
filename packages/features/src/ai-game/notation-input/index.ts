export type {
  CastlingToken,
  NotationChar,
  NotationInputAction,
  NotationInputState,
  PromotionPiece,
  UseNotationInputOptions,
  UseNotationInputReturn,
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
