import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";

import { ListIcon, ListRow } from "../../components";
import { useTheme } from "../../theme";
import { deleteSavedGame, type SavedGame } from "./game-history";
import { SideMark } from "./SideMark";

const RESULT_GLYPH = { win: "trophy", draw: "remove" } as const;

/**
 * A saved game in a list: result, colour, level, length and date. A game in
 * progress says so in place of a result, and opens the session to play on
 * rather than the game's page.
 *
 * A loss is a king lying on its side on a plain tile — the gesture of
 * tipping the king over to resign — rather than a cross on a red tile, which
 * in a learner's list (mostly losses) shouted louder than the wins. It is the
 * king rather than the web's resign flag because a loss is also a checkmate
 * or a timeout, not only a resignation. The king is always the white piece,
 * whichever side the player had: the black one disappears into the tile on
 * the dark theme, and the side is already the disc at the trailing edge
 * (`SideMark`), not a word in the title. The row's accessibility label still
 * says both in words.
 *
 * Press and hold deletes the game, finished or not, after a confirmation,
 * as the web's list offers a delete on every row. A game in progress has no
 * page of its own to carry a delete button, so this is its only way out of
 * the list. `onDeleted` lets the list read the games again.
 */
export function GameRow({
  game,
  onDeleted,
}: {
  game: SavedGame;
  onDeleted: () => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { feedbackColors, colors } = useTheme();
  // gameHistory.result.{win,loss,draw}, gameHistory.side.{white,black}
  const resultText = game.result
    ? t(`gameHistory.result.${game.result}`)
    : t("gameHistory.inProgress");
  const sideText = t(`gameHistory.side.${game.playerColor}`);
  const subtitle = t("gameHistory.rowDetail", {
    level: game.skillLevel,
    moves: Math.ceil(game.moves.length / 2),
    date: new Date(game.finishedAt).toLocaleDateString(i18n.language),
  });

  const confirmDelete = () => {
    Alert.alert(t("gameHistory.deleteConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("gameHistory.delete"),
        style: "destructive",
        onPress: () => {
          void deleteSavedGame(game.id).then(onDeleted);
        },
      },
    ]);
  };

  return (
    <ListRow
      leading={
        game.result === "loss" ? (
          <ListIcon>
            <View style={styles.fallenKing}>
              <ChessPieceIcon type="k" color="w" size={30} />
            </View>
          </ListIcon>
        ) : (
          <ListIcon
            ionicon={game.result ? RESULT_GLYPH[game.result] : "play"}
            tint={
              game.result === undefined
                ? colors.foreground
                : game.result === "win"
                  ? feedbackColors.success
                  : colors.mutedForeground
            }
          />
        )
      }
      title={resultText}
      subtitle={subtitle}
      trailing={<SideMark side={game.playerColor} />}
      accessibilityLabel={`${resultText} · ${sideText}, ${subtitle}`}
      onPress={() =>
        game.result
          ? router.push(`/play/games/${game.id}` as Href)
          : router.push({
              pathname: "/play/ai-game/session",
              params: { resume: game.id },
            })
      }
      onLongPress={confirmDelete}
      longPressLabel={t("gameHistory.delete")}
    />
  );
}

const styles = StyleSheet.create({
  // Laid on its side to the right, as a resigning player tips the king over.
  // The turn is on a wrapping view: react-native-svg does not take a
  // transform through the Svg's own style on every platform.
  fallenKing: {
    transform: [{ rotate: "90deg" }],
  },
});
