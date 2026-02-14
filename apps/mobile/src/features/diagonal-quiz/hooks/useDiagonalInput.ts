import { useCallback, useEffect, useState } from "react";

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

  const isDiagonalComplete =
    isComplete(diagonal.chars) ||
    (allowSingleSquareDiagonal && isSingleSquareComplete(diagonal.chars));
  const isAntiDiagonalComplete =
    isComplete(antiDiagonal.chars) ||
    (allowSingleSquareAntiDiagonal &&
      isSingleSquareComplete(antiDiagonal.chars));
  const areBothComplete = isDiagonalComplete && isAntiDiagonalComplete;

  const currentState = activeField === "diagonal" ? diagonal : antiDiagonal;
  const currentStep = currentState.step;

  const expectingFile = currentStep === "file1" || currentStep === "file2";
  const expectingRank = currentStep === "rank1" || currentStep === "rank2";

  const isInputtingStart = currentStep === "file1" || currentStep === "rank1";
  const isInputtingEnd = currentStep === "file2" || currentStep === "rank2";

  const handleFilePress = useCallback(
    (file: string) => {
      if (disabled) return;
      if (!expectingFile) return;

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

      const newChars = [...currentState.chars, file];
      setter({ chars: newChars, step: getStep(newChars.length) });

      const currentComplete =
        isComplete(newChars) ||
        (allowSingleCurrent && isSingleSquareComplete(newChars));
      const otherComplete =
        isComplete(otherState.chars) ||
        (allowSingleOther && isSingleSquareComplete(otherState.chars));

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
      disabled,
      expectingFile,
      activeField,
      diagonal,
      antiDiagonal,
      allowSingleSquareDiagonal,
      allowSingleSquareAntiDiagonal,
      onBothComplete,
    ],
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (disabled) return;
      if (!expectingRank) return;

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

      const newChars = [...currentState.chars, rank];
      setter({ chars: newChars, step: getStep(newChars.length) });

      const currentComplete =
        isComplete(newChars) ||
        (allowSingleCurrent && isSingleSquareComplete(newChars));
      const otherComplete =
        isComplete(otherState.chars) ||
        (allowSingleOther && isSingleSquareComplete(otherState.chars));

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
      disabled,
      expectingRank,
      activeField,
      diagonal,
      antiDiagonal,
      allowSingleSquareDiagonal,
      allowSingleSquareAntiDiagonal,
      onBothComplete,
    ],
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;

    const setter = activeField === "diagonal" ? setDiagonal : setAntiDiagonal;
    setter((prev) => {
      if (prev.chars.length === 0) return prev;
      const newChars = prev.chars.slice(0, -1);
      return { chars: newChars, step: getStep(newChars.length) };
    });
  }, [disabled, activeField]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    const setter = activeField === "diagonal" ? setDiagonal : setAntiDiagonal;
    setter(INITIAL_STATE);
  }, [disabled, activeField]);

  const reset = useCallback(() => {
    setDiagonal(INITIAL_STATE);
    setAntiDiagonal(INITIAL_STATE);
    setActiveField("diagonal");
  }, []);

  // Auto-advance from diagonal to antiDiagonal when diagonal completes
  useEffect(() => {
    if (
      activeField === "diagonal" &&
      isDiagonalComplete &&
      !isAntiDiagonalComplete
    ) {
      setActiveField("antiDiagonal");
    }
  }, [activeField, isDiagonalComplete, isAntiDiagonalComplete]);

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
