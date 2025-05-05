import { useState, useRef, useEffect } from "react";
import { AlgebraicNotation } from "@/types";
import { useTranslation } from "react-i18next";

type MoveInputProps = {
  isPlayerTurn: boolean;
  lastMove?: AlgebraicNotation;
  onMove: (move: AlgebraicNotation) => void;
};

export const MoveInput = ({
  isPlayerTurn,
  lastMove,
  onMove,
}: MoveInputProps) => {
  const { t } = useTranslation();
  const [currentMove, setCurrentMove] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPlayerTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPlayerTurn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMove && onMove) {
      onMove(currentMove as AlgebraicNotation);
      setCurrentMove("");
    }
  };

  return (
    <div className="flex flex-col space-y-4 max-w-fit mx-auto">
      <div className="text-center space-y-2">
        {lastMove && (
          <div className="text-gray-700">
            {t("game.status.lastMove")}: {lastMove}
          </div>
        )}
        {currentMove && (
          <div className="text-gray-800 font-medium">
            {t("game.status.currentInput")}: {currentMove}
          </div>
        )}
        <div className="text-gray-600">
          {isPlayerTurn ? t("game.status.yourTurn") : t("game.status.thinking")}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={currentMove}
          onChange={(e) => setCurrentMove(e.target.value)}
          disabled={!isPlayerTurn}
          placeholder={t("game.status.enterMove")}
          className="w-64 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          disabled={!isPlayerTurn || !currentMove}
          className={`w-full px-4 py-2 text-white rounded transition
            ${
              isPlayerTurn && currentMove
                ? "bg-black hover:bg-gray-800"
                : "bg-gray-400 cursor-not-allowed"
            }`}
        >
          {t("game.status.makeMove")}
        </button>
      </form>
    </div>
  );
};
