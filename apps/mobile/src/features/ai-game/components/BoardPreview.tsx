import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import type { GamePreferences } from "@blindfold-chess/features/game-preferences";
import type { Side } from "@blindfold-chess/types";

import { GamePreferencesOverride } from "../../../lib/game-preferences";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import { ChessBoard } from "./ChessBoard";

/**
 * The web preview's sample position: after 1.e4 e6, so both sides still have
 * every piece and pawn (hiding a side or the pawns shows at a glance) and
 * the most recent move, Black's e7-e6, is there to tint when "highlight last
 * move" is on.
 */
const PREVIEW_FEN =
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const PREVIEW_LAST_MOVE = { from: "e7", to: "e6" };

/** The web preview's width; a phone's panel is wider than this. */
const PREVIEW_MAX_SIZE = 280;

/**
 * What lies between the screen's edge and the board on a setup screen, on
 * both sides together: the scroll content's padding, the panel's 1px border
 * and this block's own padding.
 */
const PREVIEW_HORIZONTAL_INSET = (spacing.lg + 1 + spacing.md) * 2;

/** The preview is a picture: nothing below it changes a preference. */
const ignoreUpdate = () => {};

type Props = {
  /** The preferences to draw the board under, not yet saved anywhere. */
  preferences: Partial<GamePreferences>;
  /** The side the player will play: the board is seen from it. */
  playerColor: Side;
};

/**
 * The board as the game being set up will draw it, the web's `BoardPreview`:
 * a sample position under the chosen visibility, shape, colour and pawn
 * settings, so a difficulty level's effect is seen before the game starts.
 * With the board hidden but peekable it is what a peek will show.
 *
 * The web lets the viewer flip the preview between the two sides; here it
 * follows the colour chosen in the section above, which is the side the
 * game's board is seen from and the one "own pieces" refers to.
 *
 * The caller leaves it out when the game has no board at all
 * (`boardVisibility: "never"`), as the web does.
 */
export function BoardPreview({ preferences, playerColor }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.block} testID="board-preview">
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {t("aiGame.setup.preview")}
      </Text>
      <GamePreferencesOverride overrides={preferences} onUpdate={ignoreUpdate}>
        <ChessBoard
          fen={PREVIEW_FEN}
          flipped={playerColor === "black"}
          playerColor={playerColor}
          lastMove={PREVIEW_LAST_MOVE}
          maxSize={Math.min(PREVIEW_MAX_SIZE, width - PREVIEW_HORIZONTAL_INSET)}
        />
      </GamePreferencesOverride>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "center",
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
