import { Side, SkillLevel } from "@/types";
import { useTranslation } from "react-i18next";

type Props = {
  playerSide: Side;
  skillLevel: SkillLevel;
  errorMessage: string | null;
};

export const GameHeader = ({ playerSide, skillLevel, errorMessage }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      {errorMessage && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-center whitespace-pre-wrap">
          {errorMessage}
        </div>
      )}

      <div className="text-center mb-6">
        <div className="text-gray-800 font-medium">
          {t("game.status.playing")}:{" "}
          {playerSide === "white" ? "♔ White" : "♚ Black"}
        </div>
        <div className="text-sm text-gray-600">
          {t("game.status.aiLevel")}: {skillLevel}
        </div>
      </div>
    </>
  );
};
