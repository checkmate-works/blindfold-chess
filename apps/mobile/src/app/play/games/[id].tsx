import { Alert, Share, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { generatePgn } from "@blindfold-chess/features/chess-core";

import { Button, ListRow, ListSection, Screen } from "../../../components";
import {
  deleteSavedGame,
  type SavedGame,
} from "../../../features/game-history/game-history";
import { SavedGameSnackbar } from "../../../features/game-history/SavedGameSnackbar";
import { useSavedGames } from "../../../features/game-history/useSavedGames";
import { useTheme, borderRadius, fontSize, spacing } from "../../../theme";

/** PGN result token for the player's result and colour. */
function resultToken(game: SavedGame): string {
  // PGN's token for a game still being played.
  if (game.result === undefined) return "*";
  if (game.result === "draw") return "1/2-1/2";
  const whiteWon = (game.result === "win") === (game.playerColor === "white");
  return whiteWon ? "1-0" : "0-1";
}

/**
 * The game as PGN with real headers: chess.js fills the seven required tags
 * with "?" placeholders, so those are replaced with the date, the players
 * and the result; `SetUp` / `FEN` from a custom start are kept.
 */
function pgnOf(game: SavedGame, you: string, engine: string): string {
  let generated: string;
  try {
    generated = generatePgn(game.moves, game.startingFen);
  } catch {
    return game.moves.join(" ");
  }
  const lines = generated.split("\n");
  const kept = lines.filter((l) => /^\[(SetUp|FEN) /.test(l));
  const movetext = lines
    .filter((l) => !l.startsWith("["))
    .join(" ")
    .trim()
    .replace(/\s*\*$/, "");
  const result = resultToken(game);
  const date = game.finishedAt.slice(0, 10).replace(/-/g, ".");
  const [white, black] =
    game.playerColor === "white" ? [you, engine] : [engine, you];
  return [
    `[Date "${date}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
    ...kept,
    "",
    `${movetext} ${result}`,
  ].join("\n");
}

/**
 * One saved game: its moves, and the ways to use them — replay it from
 * memory in recall, share the PGN, or delete it.
 */
export default function SavedGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { games } = useSavedGames();
  const game = games?.find((g) => g.id === id);

  if (!game) {
    return <Screen edges={["bottom"]}>{null}</Screen>;
  }

  const pgn = pgnOf(
    game,
    t("gameHistory.you"),
    t("gameHistory.engine", { level: game.skillLevel }),
  );

  const handleDelete = () => {
    Alert.alert(t("gameHistory.deleteConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("gameHistory.delete"),
        style: "destructive",
        onPress: () => {
          void deleteSavedGame(game.id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ListSection>
          <ListRow
            title={t("gameHistory.resultLabel")}
            value={
              game.result
                ? t(`gameHistory.result.${game.result}`)
                : t("gameHistory.inProgress")
            }
          />
          <ListRow
            title={t("gameHistory.sideLabel")}
            value={t(`gameHistory.side.${game.playerColor}`)}
          />
          <ListRow
            title={t("gameHistory.levelLabel")}
            value={String(game.skillLevel)}
          />
          <ListRow
            title={t("gameHistory.dateLabel")}
            value={new Date(game.finishedAt).toLocaleString(i18n.language)}
          />
        </ListSection>

        <View
          style={[
            styles.pgnBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text selectable style={[styles.pgn, { color: colors.foreground }]}>
            {pgn}
          </Text>
        </View>

        {game.result === undefined && (
          <Button
            title={t("gameHistory.resume")}
            icon="play"
            size="lg"
            fullWidth
            onPress={() =>
              router.push({
                pathname: "/play/ai-game/session",
                params: { resume: game.id },
              })
            }
          />
        )}
        <Button
          title={t("gameHistory.recall")}
          variant={game.result === undefined ? "outline" : "primary"}
          size="lg"
          fullWidth
          onPress={() =>
            router.push({
              pathname: "/practice/recall/session",
              params: { pgn, color: game.playerColor, auto: "1" },
            })
          }
        />
        <Button
          title={t("gameHistory.share")}
          variant="outline"
          fullWidth
          onPress={() => void Share.share({ message: pgn })}
        />
        <Button
          title={t("gameHistory.delete")}
          variant="ghost"
          fullWidth
          onPress={handleDelete}
          textStyle={{ color: colors.destructive }}
        />
      </ScrollView>
      <SavedGameSnackbar />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  pgnBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  pgn: {
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
});
