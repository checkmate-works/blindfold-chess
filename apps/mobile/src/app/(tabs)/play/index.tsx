import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  Button,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { GameRow } from "../../../features/game-history/GameRow";
import { SavedGameSnackbar } from "../../../features/game-history/SavedGameSnackbar";
import { useSavedGames } from "../../../features/game-history/useSavedGames";

/** Rows of recent games shown before "see all". */
const RECENT_COUNT = 5;

/**
 * The play tab: a new game against the engine and the games played on
 * this device (the web's `/games` list, which the web also keeps in the
 * browser). Recall is reached from the practice tab only.
 */
export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { games, reload } = useSavedGames();

  // The snackbar is the scroll view's sibling, not its child: the scroll
  // view stays the screen's first view, which the native header and the
  // tab bar look for to inset it and to collapse on scroll.
  return (
    <>
      <TabScrollView>
        {/* The tab's one action, on its own: the tab's name already says
            what it plays, so a card with a title and a description over
            the button only pushed the history down. */}
        <Button
          title={t("aiGame.setup.startGame")}
          onPress={() => router.push("/play/ai-game")}
          size="lg"
          fullWidth
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
      </TabScrollView>
      <SavedGameSnackbar />
    </>
  );
}
