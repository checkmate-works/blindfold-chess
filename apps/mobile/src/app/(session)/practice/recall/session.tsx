import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  fullmoveNumberFromFen,
  getStartingFen,
  isBlackToMoveFromFen,
  parsePgnWithFen,
  replayMoves,
} from "@blindfold-chess/features/chess-core";
import { SIDES, type Side } from "@blindfold-chess/types";

import { Button, ListSection, Screen, SwitchRow } from "../../../../components";
import {
  ButtonInput,
  ChessBoard,
} from "../../../../features/ai-game/components";
import {
  computeRecallStats,
  createRecallState,
  isRecallComplete,
  revealRecallMove,
  sideOfPly,
  submitRecallMove,
} from "../../../../features/recall/recall-state";
import type { RecallPlyOutcome } from "../../../../features/recall/recall-state";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../../../theme";

/** "12." for white's move, "12…" for black's. */
function moveLabel(fullmove: number, side: Side): string {
  return side === "white" ? `${fullmove}.` : `${fullmove}…`;
}

/**
 * Recall (the web's `/practice/recall/session`): replay a game's moves from
 * memory, one at a time, with the same SAN keypad as the AI game. A right
 * move advances; a wrong one is counted and can be tried again; "I don't
 * know" shows the move and moves on. With auto-opponent on, the other
 * side's moves are played automatically. The finished run goes to the
 * result screen with the recall stats.
 */
export default function RecallSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const params = useLocalSearchParams<{
    pgn: string;
    color: string;
    auto: string;
  }>();

  const game = useMemo(() => {
    const parsed = parsePgnWithFen(params.pgn ?? "");
    const moves = parsed.ok ? parsed.value.moves : [];
    const startingFen = parsed.ok
      ? (parsed.value.startingFen ?? getStartingFen())
      : getStartingFen();
    return {
      moves,
      startingFen,
      positions: replayMoves(moves, startingFen),
    };
  }, [params.pgn]);

  const [state, setState] = useState(() =>
    createRecallState({
      moves: game.moves,
      firstMover: isBlackToMoveFromFen(game.startingFen) ? "black" : "white",
      playerColor: parseEnumParam<Side>(params.color, SIDES, "white"),
      autoOpponent: params.auto !== "0",
    }),
  );
  const [showBoard, setShowBoard] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<string | null>(null);

  const complete = isRecallComplete(state);
  const handedOff = useRef(false);
  useEffect(() => {
    if (!complete || handedOff.current) return;
    handedOff.current = true;
    const stats = computeRecallStats(state);
    router.replace({
      pathname: "/practice/recall/result",
      params: {
        total: String(stats.total),
        nailed: String(stats.nailed),
        struggled: String(stats.struggled),
        missed: String(stats.missed),
        mistakes: String(stats.mistakes),
        rate: String(stats.rate),
      },
    });
  }, [complete, state, router]);

  if (complete || game.moves.length === 0) {
    return <Screen>{null}</Screen>;
  }

  const position = game.positions[state.index];
  const side = sideOfPly(state, state.index);
  const startFullmove = fullmoveNumberFromFen(game.startingFen);
  const firstIsBlack = state.firstMover === "black";
  const fullmoveAt = (ply: number) =>
    startFullmove + Math.floor((ply + (firstIsBlack ? 1 : 0)) / 2);

  const handleSubmit = (san: string) => {
    const next = submitRecallMove(state, san);
    const correct = next.index !== state.index;
    answerHaptics(correct);
    setLastCorrect(correct ? state.moves[state.index] : null);
    setState(next);
  };

  const handleReveal = () => {
    setLastCorrect(null);
    setState(revealRecallMove(state));
  };

  const outcomeColor = (outcome: RecallPlyOutcome) => {
    if (outcome.kind === "auto") return colors.mutedForeground;
    if (outcome.kind === "revealed") return feedbackColors.error;
    return outcome.mistakes === 0 ? feedbackColors.success : colors.foreground;
  };

  return (
    <Screen>
      <SessionTopBar>
        <Text style={[styles.progress, { color: colors.mutedForeground }]}>
          {t("recall.progress", {
            current: state.index,
            total: state.moves.length,
          })}
        </Text>
      </SessionTopBar>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          style={[styles.stripFrame, { borderColor: colors.border }]}
        >
          {state.outcomes.length === 0 ? (
            <Text
              style={[styles.stripEmpty, { color: colors.mutedForeground }]}
            >
              {t("recall.noMovesYet")}
            </Text>
          ) : (
            state.outcomes.map((outcome, ply) => (
              <Text
                key={ply}
                style={[styles.stripMove, { color: outcomeColor(outcome) }]}
              >
                {ply % 2 === (firstIsBlack ? 1 : 0) || ply === 0
                  ? `${moveLabel(fullmoveAt(ply), sideOfPly(state, ply))} `
                  : ""}
                {state.moves[ply]}
              </Text>
            ))
          )}
        </ScrollView>

        <View style={[styles.prompt, { backgroundColor: colors.card }]}>
          <Text style={[styles.promptMove, { color: colors.foreground }]}>
            {moveLabel(fullmoveAt(state.index), side)}{" "}
            {t(`recall.session.toMove.${side}`)}
          </Text>
          {state.lastWrong ? (
            <Text style={[styles.feedback, { color: feedbackColors.error }]}>
              {t("recall.session.wrong", { move: state.lastWrong })}
            </Text>
          ) : lastCorrect ? (
            <Text style={[styles.feedback, { color: feedbackColors.success }]}>
              {t("recall.correctMove")} {lastCorrect}
            </Text>
          ) : null}
        </View>

        <ListSection>
          <SwitchRow
            label={t("recall.showBoard")}
            value={showBoard}
            onChange={setShowBoard}
          />
        </ListSection>
        {showBoard && (
          <ChessBoard
            fen={position.fen}
            flipped={state.playerColor === "black"}
            lastMove={position.lastMove ?? null}
          />
        )}

        <ButtonInput fen={position.fen} onSubmit={handleSubmit} />

        <Button
          title={t("recall.dontKnow")}
          variant="outline"
          onPress={handleReveal}
          fullWidth
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  stripFrame: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    flexGrow: 0,
  },
  strip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: "center",
  },
  stripEmpty: {
    fontSize: fontSize.sm,
  },
  stripMove: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  prompt: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  promptMove: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  feedback: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
