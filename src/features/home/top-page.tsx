import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameList } from "./components/game-list";
import { Game } from "@/types";
import { loadGames } from "@/lib/storage";
import { useTranslation } from "react-i18next";

export const TopPage = () => {
  const [games, setGames] = useState<Game[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setGames(loadGames());
  }, []);

  return (
    <div className="min-h-screen pb-20 relative">
      <div className="container mx-auto px-4 py-8">
        <GameList games={games} />
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate("/game/setup")}
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200"
          >
            {t("game.start")}
          </button>
        </div>
      </div>
    </div>
  );
};
