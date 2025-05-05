import { SKILL_LEVEL_OPTIONS, SkillLevel } from "@/types";
import { useTranslation } from "react-i18next";

type SkillLevelSelectorProps = {
  selectedLevel: SkillLevel;
  onLevelSelect: (level: SkillLevel) => void;
};

export const SkillLevelSelector = ({
  selectedLevel,
  onLevelSelect,
}: SkillLevelSelectorProps) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        {t("game.ai.level")}
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {SKILL_LEVEL_OPTIONS.map(({ label, value }) => {
          const isSelected = selectedLevel === value;

          return (
            <button
              key={value}
              onClick={() => onLevelSelect(value)}
              className={`py-3 px-4 border-2 rounded-lg transition
                ${
                  isSelected
                    ? "border-black bg-gray-100 ring-2 ring-gray-400 font-semibold"
                    : "border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {t(`game.ai.levels.${label.toLowerCase()}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
