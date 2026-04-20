import {
  MAX_NOTATION_INPUT_LENGTH,
  type NotationInputAction,
  type NotationInputState,
} from "./types";

export function createInitialState(): NotationInputState {
  return { input: "" };
}

export function computeIsSubmittable(state: NotationInputState): boolean {
  return state.input.length > 0;
}

export function notationInputReducer(
  state: NotationInputState,
  action: NotationInputAction,
): NotationInputState {
  switch (action.type) {
    case "appendChar": {
      if (state.input.length >= MAX_NOTATION_INPUT_LENGTH) {
        return state;
      }
      return { input: state.input + action.char };
    }

    case "appendCastling": {
      if (state.input.length + action.move.length > MAX_NOTATION_INPUT_LENGTH) {
        return state;
      }
      return { input: state.input + action.move };
    }

    case "backspace": {
      if (state.input.length === 0) {
        return state;
      }
      return { input: state.input.slice(0, -1) };
    }

    case "clear": {
      return createInitialState();
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
