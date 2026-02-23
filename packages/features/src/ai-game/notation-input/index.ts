export type {
  CastlingMove,
  NotationInputAction,
  NotationInputState,
  PromotionPiece,
} from "./types";
export {
  computeIsSubmittable,
  computeIsPawnCaptureMode,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "./state-machine";
