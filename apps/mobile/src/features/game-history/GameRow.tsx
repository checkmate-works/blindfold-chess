import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow } from "../../components";
import { useTheme } from "../../theme";
import { deleteSavedGame, type SavedGame } from "./game-history";

const RESULT_GLYPH = { win: "trophy", loss: "close", draw: "remove" } as const;

/**
 * A saved game in a list: result, colour, level, length and date. A game in
 * progress says so in place of a result, and opens the session to play on
 * rather than the game's page.
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
  const tint =
    game.result === undefined
      ? colors.foreground
      : game.result === "win"
        ? feedbackColors.success
        : game.result === "loss"
          ? feedbackColors.error
          : colors.mutedForeground;

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

  // gameHistory.result.{win,loss,draw}, gameHistory.side.{white,black}
  return (
    <ListRow
      leading={
        <ListIcon
          ionicon={game.result ? RESULT_GLYPH[game.result] : "play"}
          tint={tint}
        />
      }
      title={`${game.result ? t(`gameHistory.result.${game.result}`) : t("gameHistory.inProgress")} · ${t(`gameHistory.side.${game.playerColor}`)}`}
      subtitle={t("gameHistory.rowDetail", {
        level: game.skillLevel,
        moves: Math.ceil(game.moves.length / 2),
        date: new Date(game.finishedAt).toLocaleDateString(i18n.language),
      })}
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
