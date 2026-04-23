import {
  MAX_NOTATION_INPUT_LENGTH,
  type NotationInputAction,
  type NotationInputState,
} from "./types";

export function createInitialState(): NotationInputState {
  return {
    input: "",
    selectedPiece: null,
    selectedFiles: new Set(),
    selectedRanks: new Set(),
    targetFile: null,
    isCapture: false,
    isCheck: false,
    castling: null,
    promotionPiece: null,
    sourceFile: null,
    sourceRank: null,
    isAmbiguous: false,
  };
}

export function computeIsPawnCaptureMode(state: NotationInputState): boolean {
  return (
    !state.selectedPiece && state.selectedFiles.size === 1 && state.isCapture
  );
}

export function computeShowPromotion(state: NotationInputState): boolean {
  if (state.selectedPiece || state.castling || state.selectedRanks.size === 0) {
    return false;
  }
  const rank = Array.from(state.selectedRanks)[0];
  return rank === "1" || rank === "8";
}

export function computePreviewText(state: NotationInputState): string {
  if (state.castling) return state.castling;

  let text = "";

  if (state.selectedPiece) {
    text += state.selectedPiece;
    if (state.sourceFile) text += state.sourceFile;
    if (state.sourceRank) text += state.sourceRank;
    if (state.isCapture) text += "x";
    text += Array.from(state.selectedFiles).sort().join("");
    text += Array.from(state.selectedRanks).sort().join("");
  } else {
    const file = Array.from(state.selectedFiles)[0];
    if (file) {
      text += file;
      if (state.isCapture && state.targetFile) {
        text += "x";
        text += state.targetFile;
      }
      const rank = Array.from(state.selectedRanks)[0];
      if (rank) text += rank;
    }
    if (state.promotionPiece) {
      text += `=${state.promotionPiece.toUpperCase()}`;
    }
  }
  if (state.isCheck) text += "+";

  return text;
}

export function computeIsSubmittable(state: NotationInputState): boolean {
  return state.input.length > 0;
}

function toggleSingleSelection(
  currentSet: Set<string>,
  value: string,
): Set<string> {
  if (currentSet.has(value)) {
    return new Set();
  }
  return new Set([value]);
}

// Side-effect rules for structured state: keep derived fields self-consistent
// after any structured mutation. These mirror the useEffect rules that lived in
// the previous mobile hook, moved into the reducer so dispatchers do not have
// to replay them.
function applyStructuredSideEffects(
  state: NotationInputState,
): NotationInputState {
  let next = state;

  if (!computeIsPawnCaptureMode(next) && next.targetFile !== null) {
    next = { ...next, targetFile: null };
  }

  if (!computeShowPromotion(next) && next.promotionPiece !== null) {
    next = { ...next, promotionPiece: null };
  }

  return { ...next, input: computePreviewText(next) };
}

export function notationInputReducer(
  state: NotationInputState,
  action: NotationInputAction,
): NotationInputState {
  switch (action.type) {
    // ------------------------------------------------------------
    // Text-builder actions: operate on state.input directly. They
    // leave structured fields untouched — the web keypad never reads
    // or writes them.
    // ------------------------------------------------------------
    case "appendChar": {
      if (state.input.length >= MAX_NOTATION_INPUT_LENGTH) {
        return state;
      }
      return { ...state, input: state.input + action.char };
    }

    case "appendCastling": {
      if (state.input.length + action.move.length > MAX_NOTATION_INPUT_LENGTH) {
        return state;
      }
      return { ...state, input: state.input + action.move };
    }

    case "backspace": {
      if (state.input.length === 0) {
        return state;
      }
      return { ...state, input: state.input.slice(0, -1) };
    }

    case "clear": {
      return createInitialState();
    }

    // ------------------------------------------------------------
    // Structured actions: drive the semantic fields; state.input is
    // recomputed from those fields via applyStructuredSideEffects so
    // submitters can read a single string.
    // ------------------------------------------------------------
    case "selectPiece": {
      const newPiece =
        state.selectedPiece === action.piece ? null : action.piece;
      return applyStructuredSideEffects({
        ...state,
        selectedPiece: newPiece,
        castling: null,
        selectedFiles: newPiece === null ? new Set() : state.selectedFiles,
      });
    }

    case "selectFile": {
      return applyStructuredSideEffects({
        ...state,
        selectedFiles: toggleSingleSelection(state.selectedFiles, action.file),
        castling: null,
      });
    }

    case "selectRank": {
      return applyStructuredSideEffects({
        ...state,
        selectedRanks: toggleSingleSelection(state.selectedRanks, action.rank),
        castling: null,
      });
    }

    case "setTargetFile": {
      return applyStructuredSideEffects({ ...state, targetFile: action.file });
    }

    case "toggleCapture": {
      return applyStructuredSideEffects({
        ...state,
        isCapture: !state.isCapture,
      });
    }

    case "toggleCheck": {
      return applyStructuredSideEffects({ ...state, isCheck: !state.isCheck });
    }

    case "selectCastling": {
      if (state.castling === action.move) {
        return applyStructuredSideEffects({ ...state, castling: null });
      }
      return applyStructuredSideEffects({
        ...state,
        castling: action.move,
        selectedPiece: null,
        selectedFiles: new Set(),
        selectedRanks: new Set(),
        targetFile: null,
        promotionPiece: null,
        isCapture: false,
      });
    }

    case "selectPromotion": {
      return applyStructuredSideEffects({
        ...state,
        promotionPiece:
          state.promotionPiece === action.piece ? null : action.piece,
      });
    }

    case "selectSourceFile": {
      return applyStructuredSideEffects({
        ...state,
        sourceFile: state.sourceFile === action.file ? null : action.file,
      });
    }

    case "selectSourceRank": {
      return applyStructuredSideEffects({
        ...state,
        sourceRank: state.sourceRank === action.rank ? null : action.rank,
      });
    }

    case "toggleAmbiguous": {
      return applyStructuredSideEffects({
        ...state,
        isAmbiguous: !state.isAmbiguous,
      });
    }

    case "reset": {
      return createInitialState();
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
