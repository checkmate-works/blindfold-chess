import { Game } from "@/types";
import { useNavigate } from "react-router-dom";
import { PlayScreenState } from "@/routes/app/game/play";
import { useTranslation } from "react-i18next";

interface Props {
  games: Game[];
}

export const GameList = ({ games }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGameClick = (game: Game) => {
    navigate("/game/play", {
      state: {
        settings: {
          color: game.playerColor,
          skillLevel: game.skillLevel,
        },
        initialMoves: game.moves,
        gameId: game.id,
      } satisfies PlayScreenState,
    });
  };

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p className="text-center">{t("game.list.noGames")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <ul className="divide-y divide-gray-200">
        {games.map((game) => (
          <li
            key={game.id}
            className="py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleGameClick(game)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {new Date(game.date).toLocaleDateString()}
                </span>
                <span className="text-sm text-gray-600">
                  {t("game.list.playingAs")}{" "}
                  {t(`game.color.${game.playerColor}`)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    game.status === "win"
                      ? "bg-green-100 text-green-800"
                      : game.status === "loss"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t(`game.list.status.${game.status}`)}
                </span>
              </div>
              <div className="mt-2 sm:mt-0">
                <span className="text-sm text-gray-600">
                  {game.moves.length} {t("game.list.moves")}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
