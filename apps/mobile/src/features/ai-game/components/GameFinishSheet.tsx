import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";

import {
  BottomSheet,
  ListRow,
  ListSection,
  ModeButtonRow,
} from "../../../components";
import { spacing } from "../../../theme";
import type { GameTermination } from "../hooks/useGameSession";
import type { PlayerResult, SkillLevel } from "../lib/types";
import { ResultCard } from "./ResultCard";

type GameFinishSheetProps = {
  visible: boolean;
  /** A drag down or a tap on the backdrop: back to the finished board. */
  onClose: () => void;
  result: PlayerResult;
  termination: GameTermination;
  playerColor: Side;
  skillLevel: SkillLevel;
  moveCount: number;
  /** Exp granted for the game, once the server has answered. */
  earnedExp?: number;
  /**
   * Open the saved game's page (moves, PGN, recall). Left out for a game
   * with no move, which is never saved, so it has no page to open.
   */
  onReview?: () => void;
  /** Back to the setup screen, which still holds this game's settings. */
  onPlayAgain: () => void;
  onBackToMenu: () => void;
};

/**
 * What a finished AI game offers next, laid over the board it ended on:
 * the outcome and how it came about, then the review of the game, or
 * another game.
 *
 * It replaced a result screen the session switched to by itself a moment
 * after the last move, which took the final position away before the
 * player had looked at it. As on the web's finish dialog (and Lichess and
 * Chess.com), the board stays where it is underneath: the sheet can be
 * dragged away to study it, and the frozen controls reopen it.
 */
export function GameFinishSheet({
  visible,
  onClose,
  result,
  termination,
  playerColor,
  skillLevel,
  moveCount,
  earnedExp,
  onReview,
  onPlayAgain,
  onBackToMenu,
}: GameFinishSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      footer={
        <ModeButtonRow
          secondary={{
            title: t("aiGame.result.backToMenu"),
            onPress: onBackToMenu,
          }}
          primary={{
            title: t("aiGame.result.playAgain"),
            onPress: onPlayAgain,
          }}
        />
      }
    >
      <View style={styles.body}>
        <ResultCard
          result={result}
          termination={termination}
          playerColor={playerColor}
          skillLevel={skillLevel}
          moveCount={moveCount}
          earnedExp={earnedExp}
        />
        {onReview ? (
          <ListSection>
            <ListRow
              title={t("aiGame.result.review")}
              subtitle={t("aiGame.result.reviewDescription")}
              onPress={onReview}
            />
          </ListSection>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
});
