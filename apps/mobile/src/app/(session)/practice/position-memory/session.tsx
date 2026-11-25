import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  selectInitialPositions,
  summarizeFenSession,
} from "@blindfold-chess/features/fen-practice";
import {
  useFenPracticeSession,
  usePieceAccuracy,
} from "@blindfold-chess/features/fen-practice/client";

import { BottomBar, Button, Screen } from "../../../../components";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import {
  FenBoard,
  FenBoardEditor,
  FenProblemResult,
} from "../../../../features/fen/components";
import { parseIntParam } from "../../../../lib/route-params";
import {
  parseFenSessionParams,
  serializeFenResultParams,
  type FenSessionParams,
} from "../../../../features/fen/lib/route-params";
import {
  useTheme,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
} from "../../../../theme";

/**
 * Position memory (the web's `/practice/position-memory/session`): each
 * position is shown for the chosen number of seconds — or until "Memorized"
 * — then hidden, and the player rebuilds it on an empty board. Scoring and
 * the problem flow are the FEN drill's (`useFenPracticeSession`); only the
 * memorise step in front of each recreation is this screen's.
 */
export default function PositionMemorySession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<
    FenSessionParams & { seconds?: string }
  >();
  const memorizeSeconds = parseIntParam(params.seconds, {
    min: 1,
    fallback: 30,
  });

  // `usePieceAccuracy` resolves `pieceNames.<piece>` / `scoreDescriptions.<kind>`
  // relative to the namespace it is handed; on mobile that is `fen`, and the
  // web's `{piece}` placeholders are `{{piece}}` in the i18next resources.
  const translateFen = useCallback(
    (key: string, values?: Record<string, string>) => t(`fen.${key}`, values),
    [t],
  );
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(translateFen);

  // Read once: a reshuffle on a later render would swap the problem under the
  // player's fingers.
  const [initialPositions] = useState(() => {
    const { fens, problemCount, shuffle } = parseFenSessionParams(params);
    return selectInitialPositions(
      undefined,
      fens.length > 0 ? fens : undefined,
      problemCount,
      shuffle,
    );
  });

  const session = useFenPracticeSession({
    positions: initialPositions,
    pieceNames,
    accuracyDescriptions,
  });
  const {
    positions,
    phase,
    currentProblemIndex,
    originalPosition,
    recreatedPosition,
    currentAccuracy,
  } = session;

  // Hand the summary to the result screen once the session ends, replacing
  // this route so "back" cannot re-enter a finished session. `session` is a
  // new object every render, so the ref keeps the hand-off to a single
  // navigation.
  const handedOff = useRef(false);
  useEffect(() => {
    if (phase !== "result" || handedOff.current) return;
    handedOff.current = true;
    const summary = summarizeFenSession(session);
    router.replace({
      pathname: "/practice/position-memory/result",
      params: serializeFenResultParams(summary, positions.length),
    });
  }, [phase, session, positions.length, router]);

  const handleQuit = () => {
    Alert.alert(
      t("fen.session.quitConfirmTitle"),
      t("fen.session.quitConfirmMessage"),
      [
        { text: t("fen.session.quitConfirmNo"), style: "cancel" },
        {
          text: t("fen.session.quitConfirmYes"),
          style: "destructive",
          onPress: session.finish,
        },
      ],
    );
  };

  // The index of the last problem whose memorise step is over; the step
  // runs whenever it lags the current problem.
  const [memorizedIndex, setMemorizedIndex] = useState(-1);
  const memorizing =
    phase === "recreate" && memorizedIndex < currentProblemIndex;
  const [secondsLeft, setSecondsLeft] = useState(memorizeSeconds);

  useEffect(() => {
    if (!memorizing) return;
    setSecondsLeft(memorizeSeconds);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left =
        memorizeSeconds - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        setMemorizedIndex(currentProblemIndex);
      } else {
        setSecondsLeft(left);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [memorizing, memorizeSeconds, currentProblemIndex]);

  const isLastProblem = currentProblemIndex >= positions.length - 1;
  const progress =
    positions.length > 0 ? (currentProblemIndex + 1) / positions.length : 0;

  // Blank while the hand-off to the result screen is in flight.
  if (!originalPosition || phase === "result") {
    return <Screen>{null}</Screen>;
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <SessionTopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {positions.length > 1 && (
          <View style={styles.progressRow}>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.muted }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: colors.mutedForeground }]}
            >
              {t("fen.session.problemOf", {
                current: currentProblemIndex + 1,
                total: positions.length,
              })}
            </Text>
          </View>
        )}

        {memorizing && (
          <>
            <View style={styles.memorizeHeader}>
              <Text style={[styles.prompt, { color: colors.foreground }]}>
                {t("positionMemory.session.memorize")}
              </Text>
              <Text
                style={[styles.secondsLeft, { color: colors.primary }]}
                accessibilityLiveRegion="polite"
              >
                {t("positionMemory.setup.seconds", { count: secondsLeft })}
              </Text>
            </View>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.muted }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(secondsLeft / memorizeSeconds) * 100}%`,
                  },
                ]}
              />
            </View>
            <FenBoard
              fen={originalPosition.fen}
              flipped={originalPosition.isBlackToMove}
            />
          </>
        )}

        {phase === "recreate" && !memorizing && (
          <>
            <Text style={[styles.prompt, { color: colors.foreground }]}>
              {t("positionMemory.session.recreate")}
            </Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t("fen.session.selectPiece")}
            </Text>
            <FenBoardEditor
              // A fresh editor per problem resets the orientation to the new
              // side to move and the palette to its default.
              key={currentProblemIndex}
              fen={recreatedPosition}
              onFenChange={session.setRecreatedPosition}
              initialFlipped={originalPosition.isBlackToMove}
            />
          </>
        )}

        {phase === "problem-result" && currentAccuracy && (
          <FenProblemResult
            accuracy={currentAccuracy}
            originalFen={originalPosition.fen}
            recreatedFen={recreatedPosition}
            flipped={originalPosition.isBlackToMove}
          />
        )}
      </ScrollView>

      <BottomBar style={styles.footer}>
        {memorizing ? (
          <Button
            title={t("positionMemory.session.memorized")}
            onPress={() => setMemorizedIndex(currentProblemIndex)}
            size="lg"
            fullWidth
          />
        ) : phase === "recreate" ? (
          <>
            <Button
              title={t("fen.session.submit")}
              onPress={session.submit}
              size="lg"
              fullWidth
            />
            <View style={styles.footerRow}>
              <Button
                title={t("fen.session.skip")}
                onPress={session.skip}
                variant="ghost"
                size="sm"
                style={styles.footerButton}
              />
              <Button
                title={t("fen.session.quit")}
                onPress={handleQuit}
                variant="ghost"
                size="sm"
                style={styles.footerButton}
              />
            </View>
          </>
        ) : isLastProblem ? (
          <Button
            title={t("fen.problemResult.viewResults")}
            onPress={session.finish}
            size="lg"
            fullWidth
          />
        ) : (
          <>
            <Button
              title={t("fen.problemResult.nextProblem")}
              onPress={session.nextProblem}
              size="lg"
              fullWidth
            />
            <Button
              title={t("fen.problemResult.viewResults")}
              onPress={session.finish}
              variant="ghost"
              size="sm"
              fullWidth
            />
          </>
        )}
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressText: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
  prompt: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  memorizeHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  secondsLeft: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: fontSize.sm,
  },
  footer: {
    gap: spacing.xs,
  },
  footerRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
