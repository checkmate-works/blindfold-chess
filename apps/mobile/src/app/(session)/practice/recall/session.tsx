import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { replayMoves } from "@blindfold-chess/features/chess-core";
import {
  AUTO_FILL_ALL_THRESHOLD,
  DONT_KNOW_PROMPT_THRESHOLD,
  countCurrentMoveMistakes,
} from "@blindfold-chess/features/recall";
import {
  SIDES,
  type AlgebraicNotation,
  type Side,
} from "@blindfold-chess/types";

import { Button, ProgressBar, Screen } from "../../../../components";
import {
  BoardPeek,
  ButtonInput,
} from "../../../../features/ai-game/components";
import { RecallMovesPanel } from "../../../../features/recall/components/RecallMovesPanel";
import { recallFeedbackTitle } from "../../../../features/recall/lib/feedback";
import { readRecallPgn } from "../../../../features/recall/lib/pgn";
import { encodeRecallLog } from "../../../../features/recall/lib/result-params";
import {
  autoFillAll,
  createRecallState,
  isRecallComplete,
  revealRecallMove,
  setAutoOpponent,
  submitRecallMove,
} from "../../../../features/recall/recall-state";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { useReturnToGame } from "../../../../navigation/use-return-to-game";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { borderRadius, fontSize, spacing, useTheme } from "../../../../theme";

type Params = {
  pgn: string;
  color: string;
  /** "1" starts with "Auto-fill opponent's moves" on (a saved game's recall). */
  auto?: string;
  /**
   * "setup" when opened from the recall setup screen, `FROM_GAME` when
   * opened from an AI game's moves sheet (the × and the summary then lead
   * back to the game).
   */
  from?: string;
};

/**
 * Recall (the web's `/practice/recall/session`), stacked top-down as the
 * web's panel is: the progress bar, the board as the player's
 * `boardVisibility` surfaces it (as in an AI game), the SAN keypad, the
 * "I don't know" row and the "Auto-fill opponent's moves" switch, then the
 * moves entered so far. The latest move's result is the header's title,
 * where the web shows it as the page title.
 *
 * A wrong move is logged and can be tried again; after three on one move
 * the session offers the answer, and from the second "I don't know" it
 * offers "Auto-fill All". The finished run goes to the summary with the
 * whole move log. The web's in-session board settings and move-list
 * browsing are not ported (the board settings live in the Settings tab).
 */
export default function RecallSession() {
  const params = useLocalSearchParams<Params>();
  const game = useMemo(() => readRecallPgn(params.pgn ?? ""), [params.pgn]);
  const { close } = useCloseSession("/practice/recall");
  useReturnToGame({ from: params.from, confirm: true });

  useEffect(() => {
    if (!game) close();
  }, [game, close]);

  if (!game) return <Screen>{null}</Screen>;
  return (
    <RecallRun
      params={params}
      moves={game.moves}
      startingFen={game.hasFen ? game.startingFen : undefined}
      fullStartingFen={game.startingFen}
      firstMover={game.firstMover}
      startMoveNumber={game.startMoveNumber}
    />
  );
}

function RecallRun({
  params,
  moves,
  startingFen,
  fullStartingFen,
  firstMover,
  startMoveNumber,
}: {
  params: Params;
  moves: AlgebraicNotation[];
  startingFen: string | undefined;
  fullStartingFen: string;
  firstMover: Side;
  startMoveNumber: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, feedbackColors } = useTheme();
  const { width } = useWindowDimensions();
  const playerColor = parseEnumParam<Side>(params.color, SIDES, "white");
  const positions = useMemo(
    () => replayMoves(moves, fullStartingFen),
    [moves, fullStartingFen],
  );

  const [state, setState] = useState(() =>
    createRecallState({
      moves,
      firstMover,
      startMoveNumber,
      playerColor,
      autoOpponent: params.auto === "1",
    }),
  );

  const feedback = state.lastFeedback;
  useLayoutEffect(() => {
    navigation.setOptions({
      title: feedback
        ? recallFeedbackTitle(feedback, t)
        : t("practice.recall.title"),
      headerTitleStyle: {
        color:
          feedback?.type === "incorrect"
            ? feedbackColors.error
            : feedback?.type === "correct"
              ? feedbackColors.success
              : feedback?.type === "skipped"
                ? colors.mutedForeground
                : colors.foreground,
      },
    });
  }, [navigation, feedback, t, colors, feedbackColors]);

  const complete = isRecallComplete(state);
  const handedOff = useRef(false);
  useEffect(() => {
    if (!complete || handedOff.current) return;
    handedOff.current = true;
    router.replace({
      pathname: "/practice/recall/result",
      params: {
        pgn: params.pgn,
        color: playerColor,
        auto: params.auto ?? "0",
        from: params.from ?? "",
        log: encodeRecallLog(state.log),
      },
    });
  }, [complete, state.log, router, params, playerColor]);

  if (complete) return <Screen edges={[]}>{null}</Screen>;

  const position = positions[state.index] ?? positions[positions.length - 1];
  const played = moves.slice(0, state.index);
  const offerAnswer =
    countCurrentMoveMistakes(state.log) >= DONT_KNOW_PROMPT_THRESHOLD;

  const handleSubmit = (san: string) => {
    const next = submitRecallMove(state, san);
    answerHaptics(next.lastFeedback?.type === "correct");
    setState(next);
  };

  const confirmAutoFillAll = () =>
    Alert.alert(
      t("recall.confirmAutoFillAllTitle"),
      t("recall.confirmAutoFillAllMessage"),
      [
        { text: t("recall.cancel"), style: "cancel" },
        {
          text: t("recall.autoFillAll"),
          onPress: () => setState((s) => autoFillAll(s)),
        },
      ],
    );

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <ProgressBar current={state.index} total={moves.length} />

          <BoardPeek
            fen={position.fen}
            moves={played}
            startingFen={startingFen}
            playerColor={playerColor}
            boardMaxSize={width - PANEL_INSET}
          />

          <ButtonInput fen={position.fen} onSubmit={handleSubmit} />

          <View style={styles.actions}>
            {offerAnswer && (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.prompt, { color: colors.mutedForeground }]}
              >
                {t("recall.dontKnowPrompt")}
              </Text>
            )}
            <View style={styles.actionRow}>
              <Button
                title={
                  offerAnswer ? t("recall.revealAnswer") : t("recall.dontKnow")
                }
                icon="help-circle"
                variant={offerAnswer ? "primary" : "secondary"}
                onPress={() => setState((s) => revealRecallMove(s))}
                testID="recall-dont-know"
              />
              {state.dontKnowCount >= AUTO_FILL_ALL_THRESHOLD && (
                <Button
                  title={t("recall.autoFillAll")}
                  icon="checkmark"
                  variant="outline"
                  onPress={confirmAutoFillAll}
                  testID="recall-auto-fill-all"
                />
              )}
            </View>
          </View>

          <View style={styles.switchRow}>
            <Switch
              value={state.autoOpponent}
              onValueChange={(on) => setState((s) => setAutoOpponent(s, on))}
              testID="recall-auto-opponent"
            />
            <Text
              style={[styles.switchLabel, { color: colors.mutedForeground }]}
            >
              {t("recall.autoOpponentMoves")}
            </Text>
          </View>
        </View>

        <RecallMovesPanel
          moves={played}
          firstMover={firstMover}
          startMoveNumber={startMoveNumber}
        />
      </ScrollView>
    </Screen>
  );
}

/** The page's and the panel's padding on both sides, and the panel's border. */
const PANEL_INSET = spacing.md * 4 + 2;

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  // The web's `border rounded-lg p-4` panel with `gap-6` between its parts.
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.lg,
  },
  actions: {
    alignItems: "center",
    gap: spacing.sm,
  },
  prompt: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});
