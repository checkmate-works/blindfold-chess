import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { GameRow } from "../../../features/game-history/GameRow";
import { useSavedGames } from "../../../features/game-history/useSavedGames";

/** Rows of recent games shown before "see all". */
const RECENT_COUNT = 5;

/**
 * The play tab: a new game against the engine, the games played on this
 * device (the web's `/games` list, which the web also keeps in the
 * browser), and recall for replaying a game from memory.
 */
export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const games = useSavedGames();

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
              .map((game) => <GameRow key={game.id} game={game} />),
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

      <ListSection>
        <ListRow
          leading={<ListIcon glyph="🔁" />}
          title={t("practice.recall.title")}
          subtitle={t("practice.recall.description")}
          onPress={() => router.push("/practice/recall")}
        />
      </ListSection>
    </TabScrollView>
  );
}
