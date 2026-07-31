"use client";

import { useCallback, useState } from "react";

type InputStep = "file1" | "rank1" | "file2" | "rank2" | "complete";

type DiagonalInputState = {
  chars: string[];
  step: InputStep;
};

const INITIAL_STATE: DiagonalInputState = {
  chars: [],
  step: "file1",
};

function getStep(length: number): InputStep {
  switch (length) {
    case 0:
      return "file1";
    case 1:
      return "rank1";
    case 2:
      return "file2";
    case 3:
      return "rank2";
    default:
      return "complete";
  }
}

function buildDisplayText(chars: string[]): string {
  if (chars.length === 0) return "";
  if (chars.length <= 2) return chars.join("");
  // After 2 chars, insert hyphen: "b1-h7"
  return chars.slice(0, 2).join("") + "-" + chars.slice(2).join("");
}

function buildStartText(chars: string[]): string {
  if (chars.length === 0) return "";
  return chars.slice(0, 2).join("");
}

function buildEndText(chars: string[]): string {
  if (chars.length <= 2) return "";
  return chars.slice(2).join("");
}

function isComplete(chars: string[]): boolean {
  return chars.length >= 4;
}

function isSingleSquareComplete(chars: string[]): boolean {
  return chars.length === 2;
}

function isFieldComplete(chars: string[], allowSingleSquare: boolean): boolean {
  return (
    isComplete(chars) || (allowSingleSquare && isSingleSquareComplete(chars))
  );
}

export type ActiveField = "diagonal" | "antiDiagonal";

type UseDiagonalInputProps = {
  onBothComplete: (diagonal: string, antiDiagonal: string) => void;
  disabled: boolean;
  allowSingleSquareDiagonal?: boolean;
  allowSingleSquareAntiDiagonal?: boolean;
};

export function useDiagonalInput({
  onBothComplete,
  disabled,
  allowSingleSquareDiagonal = false,
  allowSingleSquareAntiDiagonal = false,
}: UseDiagonalInputProps) {
  const [diagonal, setDiagonal] = useState<DiagonalInputState>(INITIAL_STATE);
  const [antiDiagonal, setAntiDiagonal] =
    useState<DiagonalInputState>(INITIAL_STATE);
  const [activeField, setActiveField] = useState<ActiveField>("diagonal");

  const diagonalText = buildDisplayText(diagonal.chars);
  const antiDiagonalText = buildDisplayText(antiDiagonal.chars);

  const diagonalStartText = buildStartText(diagonal.chars);
  const diagonalEndText = buildEndText(diagonal.chars);
  const antiDiagonalStartText = buildStartText(antiDiagonal.chars);
  const antiDiagonalEndText = buildEndText(antiDiagonal.chars);

  const isDiagonalComplete = isFieldComplete(
    diagonal.chars,
    allowSingleSquareDiagonal,
  );
  const isAntiDiagonalComplete = isFieldComplete(
    antiDiagonal.chars,
    allowSingleSquareAntiDiagonal,
  );
  const areBothComplete = isDiagonalComplete && isAntiDiagonalComplete;

  // Auto-advance from diagonal to antiDiagonal when diagonal completes.
  // Render-phase adjustment (not an effect): completion is itself computed
  // during this render, and the effect version committed one frame with the
  // focus still on the finished field before correcting itself.
  if (
    activeField === "diagonal" &&
    isDiagonalComplete &&
    !isAntiDiagonalComplete
  ) {
    setActiveField("antiDiagonal");
  }

  const currentState = activeField === "diagonal" ? diagonal : antiDiagonal;
  const currentStep = currentState.step;

  const expectingFile = currentStep === "file1" || currentStep === "file2";
  const expectingRank = currentStep === "rank1" || currentStep === "rank2";

  // Whether the user is currently inputting the start square or end square
  const isInputtingStart = currentStep === "file1" || currentStep === "rank1";
  const isInputtingEnd = currentStep === "file2" || currentStep === "rank2";

  // Append one keystroke to the active field, then fire onBothComplete if this
  // keystroke filled the last remaining field. file and rank presses share this
  // body verbatim — they differ only in the expecting* guard checked upstream.
  const appendChar = useCallback(
    (char: string) => {
      const setter = activeField === "diagonal" ? setDiagonal : setAntiDiagonal;
      const currentState = activeField === "diagonal" ? diagonal : antiDiagonal;
      const otherState = activeField === "diagonal" ? antiDiagonal : diagonal;
      const allowSingleCurrent =
        activeField === "diagonal"
          ? allowSingleSquareDiagonal
          : allowSingleSquareAntiDiagonal;
      const allowSingleOther =
        activeField === "diagonal"
          ? allowSingleSquareAntiDiagonal
          : allowSingleSquareDiagonal;

      const newChars = [...currentState.chars, char];
      setter({ chars: newChars, step: getStep(newChars.length) });

      // Check synchronous completion (possible when single-square mode allows
      // 2-char completion).
      const currentComplete = isFieldComplete(newChars, allowSingleCurrent);
      const otherComplete = isFieldComplete(otherState.chars, allowSingleOther);

      if (currentComplete && otherComplete) {
        const currentText = buildDisplayText(newChars);
        const otherText = buildDisplayText(otherState.chars);
        if (activeField === "diagonal") {
          onBothComplete(currentText, otherText);
        } else {
          onBothComplete(otherText, currentText);
        }
      }
    },
    [
      activeField,
      diagonal,
      antiDiagonal,
      allowSingleSquareDiagonal,
      allowSingleSquareAntiDiagonal,
      onBothComplete,
    ],
  );

  const handleFilePress = useCallback(
    (file: string) => {
      if (disabled) return;
      if (!expectingFile) return;
      appendChar(file);
    },
    [disabled, expectingFile, appendChar],
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (disabled) return;
      if (!expectingRank) return;
      appendChar(rank);
    },
    [disabled, expectingRank, appendChar],
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;

    // If the active field is empty but the other field has chars, fall back
    // to the other field. This makes Backspace behave as a true "undo last
    // keystroke" across both inputs — otherwise the user gets stuck on an
    // empty field and Backspace appears dead. Both directions are supported:
    //   - antiDiagonal → diagonal (typical after auto-advance with no typing)
    //   - diagonal → antiDiagonal (user manually tapped back to a drained
    //     diagonal field while anti-diagonal still has content)
    if (activeField === "antiDiagonal" && antiDiagonal.chars.length === 0) {
      if (diagonal.chars.length === 0) return;
      const newChars = diagonal.chars.slice(0, -1);
      setDiagonal({ chars: newChars, step: getStep(newChars.length) });
      setActiveField("diagonal");
      return;
    }
    if (activeField === "diagonal" && diagonal.chars.length === 0) {
      if (antiDiagonal.chars.length === 0) return;
      const newChars = antiDiagonal.chars.slice(0, -1);
      setAntiDiagonal({ chars: newChars, step: getStep(newChars.length) });
      setActiveField("antiDiagonal");
      return;
    }

    const setter = activeField === "diagonal" ? setDiagonal : setAntiDiagonal;
    setter((prev) => {
      if (prev.chars.length === 0) return prev;
      const newChars = prev.chars.slice(0, -1);
      return { chars: newChars, step: getStep(newChars.length) };
    });
  }, [disabled, activeField, antiDiagonal.chars, diagonal.chars]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    // Clear wipes both fields and returns focus to the diagonal field, so the
    // user can start the answer over from scratch regardless of which field
    // was active when Clear was pressed. This is especially important once the
    // diagonal has auto-advanced to the anti-diagonal with nothing typed yet —
    // a "clear the active field only" Clear would then be a silent no-op.
    setDiagonal(INITIAL_STATE);
    setAntiDiagonal(INITIAL_STATE);
    setActiveField("diagonal");
  }, [disabled]);

  const reset = useCallback(() => {
    setDiagonal(INITIAL_STATE);
    setAntiDiagonal(INITIAL_STATE);
    setActiveField("diagonal");
  }, []);

  return {
    diagonalText,
    antiDiagonalText,
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    setActiveField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    areBothComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    currentStep,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    reset,
  };
}

export type UseDiagonalInputReturn = ReturnType<typeof useDiagonalInput>;
