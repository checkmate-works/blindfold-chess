import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection, TabScrollView } from "../../../components";
import { PracticeCard } from "../../../features/practice-list/PracticeCard";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { GameRow } from "../../../features/game-history/GameRow";
import { useSavedGames } from "../../../features/game-history/useSavedGames";
import { MOBILE_PRACTICE_MODULES } from "../../../navigation/practice-modules";

/** Rows of recent games shown before "see all". */
const RECENT_COUNT = 5;

/** The recall entry shares the practice catalogue card. */
const RECALL_MODULE = MOBILE_PRACTICE_MODULES.find((m) => m.slug === "recall");

/**
 * The play tab: a new game against the engine, the games played on this
 * device (the web's `/games` list, which the web also keeps in the
 * browser), and recall for replaying a game from memory.
 */
export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { games, reload } = useSavedGames();

  return (
    <TabScrollView>
      <AiGameCard
        buttonTitle={t("aiGame.setup.startGame")}
        onPress={() => router.push("/play/ai-game")}
      />

      <ListSection title={t("gameHistory.title")}>
        {games && games.length > 0 ? (
          [
            ...games
              .slice(0, RECENT_COUNT)
              .map((game) => (
                <GameRow key={game.id} game={game} onDeleted={reload} />
              )),
            ...(games.length > RECENT_COUNT
              ? [
                  <ListRow
                    key="all"
                    title={t("gameHistory.seeAll", { count: games.length })}
                    onPress={() => router.push("/play/games")}
                  />,
                ]
              : []),
          ]
        ) : (
          <ListRow title={t("gameHistory.empty")} />
        )}
      </ListSection>

      {RECALL_MODULE && <PracticeCard module={RECALL_MODULE} />}
    </TabScrollView>
  );
}
