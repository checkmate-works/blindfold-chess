import type { NotationInputAction, NotationInputState } from "./types";

export function createInitialState(): NotationInputState {
  return {
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
  return computePreviewText(state).length > 0;
}

function toggleFileSelection(
  currentFiles: Set<string>,
  file: string,
): Set<string> {
  if (currentFiles.has(file)) {
    return new Set();
  }
  return new Set([file]);
}

function toggleRankSelection(
  currentRanks: Set<string>,
  rank: string,
): Set<string> {
  if (currentRanks.has(rank)) {
    return new Set();
  }
  return new Set([rank]);
}

/**
 * Apply side-effect rules that depend on derived state.
 * These correspond to the useEffect hooks in the original React implementations:
 * - Clear targetFile when not in pawn capture mode
 * - Clear targetFile when isCapture is false
 * - Clear promotionPiece when showPromotion becomes false
 */
function applySideEffects(state: NotationInputState): NotationInputState {
  let next = state;

  if (!computeIsPawnCaptureMode(next) && next.targetFile !== null) {
    next = { ...next, targetFile: null };
  }

  if (!next.isCapture && next.targetFile !== null) {
    next = { ...next, targetFile: null };
  }

  if (!computeShowPromotion(next) && next.promotionPiece !== null) {
    next = { ...next, promotionPiece: null };
  }

  return next;
}

export function notationInputReducer(
  state: NotationInputState,
  action: NotationInputAction,
): NotationInputState {
  let next: NotationInputState;

  switch (action.type) {
    case "selectPiece": {
      const newPiece =
        state.selectedPiece === action.piece ? null : action.piece;
      next = {
        ...state,
        selectedPiece: newPiece,
        castling: state.castling ? null : state.castling,
        selectedFiles: newPiece === null ? new Set() : state.selectedFiles,
      };
      break;
    }

    case "selectFile": {
      const newFiles = toggleFileSelection(state.selectedFiles, action.file);
      next = {
        ...state,
        selectedFiles: newFiles,
        castling: state.castling ? null : state.castling,
      };
      break;
    }

    case "selectRank": {
      const newRanks = toggleRankSelection(state.selectedRanks, action.rank);
      next = {
        ...state,
        selectedRanks: newRanks,
        castling: state.castling ? null : state.castling,
      };
      break;
    }

    case "toggleCapture": {
      next = { ...state, isCapture: !state.isCapture };
      break;
    }

    case "toggleCheck": {
      next = { ...state, isCheck: !state.isCheck };
      break;
    }

    case "selectCastling": {
      if (state.castling === action.move) {
        next = { ...state, castling: null };
      } else {
        next = {
          ...state,
          castling: action.move,
          selectedPiece: null,
          selectedFiles: new Set(),
          selectedRanks: new Set(),
          targetFile: null,
          promotionPiece: null,
          isCapture: false,
        };
      }
      break;
    }

    case "selectPromotion": {
      next = {
        ...state,
        promotionPiece:
          state.promotionPiece === action.piece ? null : action.piece,
      };
      break;
    }

    case "selectSourceFile": {
      next = {
        ...state,
        sourceFile: state.sourceFile === action.file ? null : action.file,
      };
      break;
    }

    case "selectSourceRank": {
      next = {
        ...state,
        sourceRank: state.sourceRank === action.rank ? null : action.rank,
      };
      break;
    }

    case "toggleAmbiguous": {
      next = { ...state, isAmbiguous: !state.isAmbiguous };
      break;
    }

    case "setTargetFile": {
      next = { ...state, targetFile: action.file };
      break;
    }

    case "reset": {
      next = createInitialState();
      break;
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }

  return applySideEffects(next);
}
