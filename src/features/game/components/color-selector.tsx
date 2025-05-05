import { PlayerColor } from "@/types";
import { ColorOption } from "./color-option";
import { useTranslation } from "react-i18next";

type ColorSelectorProps = {
  selectedColor: PlayerColor;
  onColorSelect: (color: PlayerColor) => void;
};

export const ColorSelector = ({
  selectedColor,
  onColorSelect,
}: ColorSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{t("game.color.title")}</h3>
      <div className="grid grid-cols-3 gap-4">
        {(["white", "black", "random"] as PlayerColor[]).map((color) => (
          <ColorOption
            key={color}
            color={color}
            selected={selectedColor === color}
            onClick={() => onColorSelect(color)}
          />
        ))}
      </div>
    </div>
  );
};
