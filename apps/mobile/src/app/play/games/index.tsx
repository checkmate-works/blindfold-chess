import { ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection, Screen } from "../../../components";
import { GameRow } from "../../../features/game-history/GameRow";
import { useSavedGames } from "../../../features/game-history/useSavedGames";
import { spacing } from "../../../theme";

/** Every game kept on the device, newest first. */
export default function SavedGamesScreen() {
  const { t } = useTranslation();
  const games = useSavedGames();
  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ListSection footer={t("gameHistory.note")}>
          {games && games.length > 0 ? (
            games.map((game) => <GameRow key={game.id} game={game} />)
          ) : (
            <ListRow title={t("gameHistory.empty")} />
          )}
        </ListSection>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
});
