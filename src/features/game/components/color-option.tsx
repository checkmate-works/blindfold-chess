import { PlayerColor } from "@/types";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

type ColorOptionProps = {
  color: PlayerColor;
  selected?: boolean;
  onClick?: () => void;
};

const iconMap: Record<PlayerColor, string> = {
  white: "♔",
  black: "♚",
  random: "🎲",
};

export const ColorOption = ({ color, selected, onClick }: ColorOptionProps) => {
  const { t } = useTranslation();
  const baseClasses =
    "w-full aspect-square rounded-2xl flex flex-col items-center justify-center space-y-1 font-medium transition-all overflow-hidden border-2";

  const colorClasses = clsx({
    "bg-white text-black border-black": color === "white",
    "bg-black text-white border-white": color === "black",
    "bg-[linear-gradient(to_right,white_50%,black_50%)] text-black border-gray-400":
      color === "random",
  });

  const ringColor = clsx({
    "ring-2 ring-gray-400 ring-offset-2": color === "white" && selected,
    "ring-2 ring-gray-200 ring-offset-2": color === "black" && selected,
    "ring-2 ring-gray-300 ring-offset-2": color === "random" && selected,
  });

  return (
    <button
      onClick={onClick}
      className={clsx(baseClasses, colorClasses, ringColor, {
        "hover:opacity-90": !selected,
      })}
      aria-label={t(`game.color.${color}`)}
    >
      <span className="text-5xl leading-none">{iconMap[color]}</span>
    </button>
  );
};
