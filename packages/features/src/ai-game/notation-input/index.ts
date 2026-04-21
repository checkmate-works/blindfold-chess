export type {
  CastlingToken,
  NotationChar,
  NotationInputAction,
  NotationInputState,
} from "./types";
export { MAX_NOTATION_INPUT_LENGTH } from "./types";
export {
  computeIsSubmittable,
  createInitialState,
  notationInputReducer,
} from "./state-machine";
