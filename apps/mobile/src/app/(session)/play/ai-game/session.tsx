import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { isValidSkillLevel } from "@blindfold-chess/features/ai-game";
import { validateFen } from "@blindfold-chess/features/chess-core";
import {
  type GamePreferences,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";
import { findLastAiMoveNotation } from "@blindfold-chess/features/game-play";
import type { MoveOperationLog } from "@blindfold-chess/features/game-record";
import {
  resolveLosingColor,
  resolveTerminationMark,
} from "@blindfold-chess/features/board-display";
import { useAiReplyChip } from "@blindfold-chess/features/game-play/client";
import {
  SIDES,
  type AlgebraicNotation,
  type Side,
} from "@blindfold-chess/types";

import { StockfishWebView } from "../../../../features/ai-game/engine";
import {
  InlineBoard,
  ButtonInput,
  MoveHistory,
  GameFinishSheet,
  GameInfo,
  GameMenuSheet,
  ResultHeadline,
} from "../../../../features/ai-game/components";
import {
  useAiGameExpGrant,
  useAiVersus,
  useGameSession,
} from "../../../../features/ai-game/hooks";
import type { SkillLevel } from "../../../../features/ai-game/lib/types";
import {
  decodeGamePrefsParam,
  pickValidPerGamePreferences,
} from "../../../../features/ai-game/lib/game-prefs-param";
import {
  isInProgress,
  loadSavedGame,
  saveGame,
} from "../../../../features/game-history/game-history";
import { postSavedGameNotice } from "../../../../features/game-history/saved-game-notice";
import { differsFromStart } from "../../../../features/game-history/session-changes";
import { useCloseSession } from "../../../../navigation/use-close-session";
import {
  GamePreferencesOverride,
  useGamePreferences,
} from "../../../../lib/game-preferences";
import { parseEnumParam } from "../../../../lib/route-params";
import {
  BottomSheet,
  Button,
  ListSection,
  Screen,
} from "../../../../components";
import { perGameSettingRows } from "../../../../features/settings/per-game-setting-rows";
import { HeaderIconButton } from "../../../../navigation/HeaderIconButton";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import { useTheme, fontSize, spacing } from "../../../../theme";

/** Everything a session starts from: a new game's choices or a saved game. */
type GameSetup = {
  /** The saved game's id. A UUID, because the Exp grant is keyed by it. */
  gameId: string;
  playerColor: Side;
  skillLevel: SkillLevel;
  startingFen?: string;
  moves: AlgebraicNotation[];
  operationLogs: MoveOperationLog[];
  /** This game's preferences, laid over the global ones. */
  gamePrefs: Partial<GamePreferences>;
};

function skillLevelOf(value: number): SkillLevel {
  return isValidSkillLevel(value) ? value : 5;
}

/**
 * The AI game, new or resumed.
 *
 * A new game comes with its setup's choices as route params (`playerColor`,
 * `skillLevel`, `gamePrefs`, and `startingFen` for a game from a guide's
 * position; the onboarding's first game sends no `gamePrefs` and plays
 * under the global preferences). A game picked up
 * from the history comes as `resume`, the saved game's id, and everything
 * else is read from the device, so the game continues from the position,
 * the operation record and the settings it was left with.
 */
export default function AiGameSession() {
  const params = useLocalSearchParams<{
    playerColor?: string;
    skillLevel?: string;
    gamePrefs?: string;
    startingFen?: string;
    resume?: string;
  }>();
  const { close } = useCloseSession("/play");

  // Built once: a new game's id must not change between renders.
  const [setup, setSetup] = useState<GameSetup | null>(() =>
    params.resume
      ? null
      : {
          gameId: Crypto.randomUUID(),
          playerColor: parseEnumParam<Side>(params.playerColor, SIDES, "white"),
          skillLevel: skillLevelOf(Number(params.skillLevel)),
          // A deep link can carry anything; a FEN chess.js rejects starts
          // from the standard position instead.
          startingFen:
            params.startingFen && validateFen(params.startingFen)
              ? params.startingFen
              : undefined,
          moves: [],
          operationLogs: [],
          gamePrefs: decodeGamePrefsParam(params.gamePrefs),
        },
  );

  const resumeId = params.resume;
  useEffect(() => {
    if (!resumeId) return;
    let active = true;
    void loadSavedGame(resumeId).then((saved) => {
      if (!active) return;
      // Deleted meanwhile, or already finished: there is nothing to play.
      if (!saved || !isInProgress(saved)) {
        close();
        return;
      }
      setSetup({
        gameId: saved.id,
        playerColor: saved.playerColor,
        skillLevel: skillLevelOf(saved.skillLevel),
        startingFen: saved.startingFen,
        moves: saved.moves as AlgebraicNotation[],
        operationLogs: saved.operationLogs ?? [],
        gamePrefs: pickValidPerGamePreferences(saved.gamePrefs),
      });
    });
    return () => {
      active = false;
    };
  }, [resumeId, close]);

  if (!setup) return <Screen>{null}</Screen>;
  return <AiGameWithPreferences setup={setup} />;
}

/**
 * Lays the game's own preferences over the global ones for everything
 * below, so the board and the input read this game's values without knowing
 * it. Changes made mid-game land here, not in the stored preferences.
 */
function AiGameWithPreferences({ setup }: { setup: GameSetup }) {
  const [overrides, setOverrides] = useState(setup.gamePrefs);
  const updateOverrides = useCallback(
    (updates: Partial<GamePreferences>) =>
      setOverrides((current) => ({ ...current, ...updates })),
    [],
  );

  return (
    <GamePreferencesOverride overrides={overrides} onUpdate={updateOverrides}>
      <AiGameBoard setup={setup} />
    </GamePreferencesOverride>
  );
}

function AiGameBoard({ setup }: { setup: GameSetup }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences, updatePreferences } = useGamePreferences();
  // The board starts from the player's side and can be turned round.
  const [flipped, setFlipped] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [movesOpen, setMovesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The top inset is padded from the provider's value rather than left to
  // `Screen`'s `SafeAreaView`: in a header-less screen of the full-screen
  // session modal the view's own top inset comes out as 0 on iOS, which put
  // the top row under the status bar. `PracticeSessionScreen` does the same.
  const insets = useSafeAreaInsets();
  const { gameId, playerColor, skillLevel } = setup;
  const start = setup;
  // "Play again" reveals the setup screen under the modal, which still holds
  // this game's settings; the setup is where to fall back to without one.
  const { close: closeToSetup, closeToMenu } = useCloseSession("/play/ai-game");

  const ai = useAiVersus(skillLevel);

  const game = useGameSession({
    playerColor,
    skillLevel,
    getAiMove: ai.getAiMove,
    isAiLoading: ai.isLoading,
    resetAi: ai.reset,
    startingFen: start.startingFen,
    initialMoves: start.moves,
    initialOperationLogs: start.operationLogs,
  });

  // The AI's reply is announced where the board would be, for as long as the
  // player chose, and only while the board is out of sight: on an open board
  // the move is already visible.
  const aiReply = useAiReplyChip({
    isAiThinking: game.isAiThinking,
    aiMoveSignal: game.aiMoveSignal,
    durationMs: preferences.aiReplyDuration,
  });
  const announcedAiMove =
    aiReply.active && !aiReply.thinking
      ? findLastAiMoveNotation(game.moves, playerColor, start.startingFen)
      : null;

  // A peek opens the board until the player's next move is accepted, then
  // the mask returns, as on the web. Only the player's own move closes it:
  // the AI's reply or an undo leave an opened board open.
  const [revealed, setRevealed] = useState(false);
  const { recordPeek, submitMove: submitGameMove } = game;
  const submitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (submitGameMove(move)) setRevealed(false);
    },
    [submitGameMove],
  );
  // A move made on the board (tap or drag), as on the web: only on an
  // uncovered board (`InlineBoard` enforces that) and only while the player
  // can move. It goes through the same submit, so it is validated, counted
  // and closes a peek like a typed one; the log tags it `'board'`.
  const submitBoardMove = useCallback(
    (san: string) => {
      if (submitGameMove(san as AlgebraicNotation, "board")) {
        setRevealed(false);
      }
    },
    [submitGameMove],
  );
  const canBoardMove =
    !ai.isLoading &&
    game.isPlayerTurn &&
    !game.isAiThinking &&
    game.gameStatus === "in_progress";
  // The screen scrolls, so it stops while a piece is held: otherwise a drag
  // down the board would scroll the screen under the finger.
  const [pieceHeld, setPieceHeld] = useState(false);
  const dismissAiReply = aiReply.dismiss;
  const revealBoard = useCallback(() => {
    setRevealed(true);
    recordPeek();
    dismissAiReply();
  }, [recordPeek, dismissAiReply]);

  const confirmUndo = () => {
    Alert.alert(
      t("aiGame.session.confirmUndoTitle"),
      t("aiGame.session.confirmUndoMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("aiGame.session.confirmUndo"), onPress: game.undo },
      ],
    );
  };

  const confirmResign = () => {
    Alert.alert(
      t("aiGame.session.confirmResignTitle"),
      t("aiGame.session.confirmResignMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("aiGame.session.confirmResign"),
          style: "destructive",
          onPress: game.resign,
        },
      ],
    );
  };

  // The game is written to the device after every move, so leaving the
  // screen (or losing the app) never loses it: the history lists it as in
  // progress and opens it again here. A game with no move yet is not worth a
  // row, so saving starts with the first one; a resumed game is already on
  // the device, so it is written again only once it changes
  // (`differsFromStart`). Once written, it is written on every change, even
  // back to where it started.
  const perGamePrefs = useMemo(
    () => pickPerGamePreferences(preferences),
    [preferences],
  );
  const [startPrefsKey] = useState(() => JSON.stringify(perGamePrefs));
  const hasBeenSaved = useRef(false);
  useEffect(() => {
    if (
      !hasBeenSaved.current &&
      !differsFromStart(
        { moves: start.moves, prefsKey: startPrefsKey },
        {
          moves: game.moves,
          result: game.playerResult,
          prefsKey: JSON.stringify(perGamePrefs),
        },
      )
    ) {
      return;
    }
    hasBeenSaved.current = true;
    void saveGame({
      id: gameId,
      finishedAt: new Date().toISOString(),
      playerColor,
      skillLevel,
      ...(game.playerResult ? { result: game.playerResult } : {}),
      moves: [...game.moves],
      startingFen: start.startingFen,
      operationLogs: game.operationLogs,
      gamePrefs: perGamePrefs,
    });
  }, [
    game.moves,
    game.playerResult,
    game.operationLogs,
    perGamePrefs,
    gameId,
    playerColor,
    skillLevel,
    start.startingFen,
    start.moves,
    startPrefsKey,
  ]);

  // Closing an unfinished game that this session saved tells the screen
  // below so ("Game saved", with Resume). Posted as the session goes away
  // rather than from the ×, so Android's back button, which also pops the
  // modal, says it too. A game that ended goes on to its result instead, and
  // one this session never wrote (a new game with no move, a resumed one
  // left as it was opened) has nothing to announce.
  const inProgressRef = useRef(true);
  useEffect(() => {
    inProgressRef.current = game.gameStatus === "in_progress";
  }, [game.gameStatus]);
  useEffect(
    () => () => {
      if (inProgressRef.current && hasBeenSaved.current) {
        postSavedGameNotice(gameId);
      }
    },
    [gameId],
  );

  // A finished game stays on its board, uncovered and with the losing king
  // marked, and the finish sheet comes up over it a moment later, so the
  // player sees how the game ended before being asked what next. It opens
  // once; dragged away, it comes back from the button over the frozen
  // controls.
  const finished = game.termination !== null && game.playerResult !== null;
  const [finishSheetOpen, setFinishSheetOpen] = useState(false);
  const finishSheetShown = useRef(false);
  useEffect(() => {
    if (!finished || finishSheetShown.current) return;
    const timer = setTimeout(() => {
      finishSheetShown.current = true;
      setFinishSheetOpen(true);
    }, FINISH_SHEET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  const terminationMark = useMemo(
    () =>
      finished
        ? resolveTerminationMark({
            fen: game.currentFen,
            losingColor: resolveLosingColor(game.playerResult, playerColor),
            isCheckmate: game.termination === "checkmate",
          })
        : null,
    [
      finished,
      game.currentFen,
      game.playerResult,
      game.termination,
      playerColor,
    ],
  );

  const exp = useAiGameExpGrant({
    gameId,
    result: finished ? game.playerResult : null,
    skillLevel,
    operationLogs: game.operationLogs,
  });

  const reviewGame = () => {
    setFinishSheetOpen(false);
    // The saved game's page is on the root stack, under this modal.
    // `dismissTo` leaves the modal for it rather than pushing a root screen
    // from inside the session stack.
    router.dismissTo({ pathname: "/play/games/[id]", params: { id: gameId } });
  };

  return (
    <Screen
      edges={["bottom", "left", "right"]}
      style={{ paddingTop: insets.top }}
    >
      {/* Hidden WebView for Stockfish engine */}
      <StockfishWebView
        key={ai.webViewKey}
        ref={ai.webViewRef}
        onMessage={ai.handleMessage}
        onReady={ai.handleWebViewReady}
        onError={ai.handleWebViewError}
      />

      {/* Leaving asks nothing: the game is saved and can be resumed, which
          the screen underneath then says. */}
      <SessionTopBar confirm={false}>
        <View style={styles.topRow}>
          <GameInfo
            isPlayerTurn={game.isPlayerTurn}
            isAiThinking={game.isAiThinking}
            gameStatus={game.gameStatus}
            resigned={game.resigned}
            aiMoveFailed={game.aiMoveFailed}
            skillLevel={skillLevel}
          />
          <HeaderIconButton
            icon="list"
            accessibilityLabel={t("aiGame.session.moves")}
            onPress={() => setMovesOpen(true)}
          />
          {(preferences.boardVisibility !== "never" || finished) && (
            <HeaderIconButton
              icon="swap-vertical"
              accessibilityLabel={t("aiGame.session.flipBoard")}
              onPress={() =>
                setFlipped((current) => !(current ?? playerColor === "black"))
              }
            />
          )}
          <HeaderIconButton
            icon="settings-outline"
            accessibilityLabel={t("common.gameSettings")}
            onPress={() => setSettingsOpen(true)}
          />
          {/* Take back and resign: once a game at most, so they are kept
              away from the keypad, where a slip off the submit key could
              reach them. */}
          <HeaderIconButton
            icon="ellipsis-horizontal"
            accessibilityLabel={t("aiGame.session.gameMenu")}
            onPress={() => setMenuOpen(true)}
          />
        </View>
      </SessionTopBar>
      <ScrollView
        scrollEnabled={!pieceHeld}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <InlineBoard
          fen={game.currentFen}
          moves={game.moves}
          startingFen={start.startingFen}
          playerColor={playerColor}
          flipped={flipped ?? playerColor === "black"}
          revealed={revealed}
          onReveal={revealBoard}
          thinking={aiReply.thinking}
          announcedAiMove={announcedAiMove}
          onMove={canBoardMove ? submitBoardMove : undefined}
          finished={finished}
          terminationMark={terminationMark}
          terminationMarkLabel={
            terminationMark
              ? // aiGame.result.termination.<TerminationMarkKind>: aiGame.result.termination.checkmate, aiGame.result.termination.resignation
                t(`aiGame.result.termination.${terminationMark.kind}`)
              : undefined
          }
          onIllegalMove={canBoardMove ? game.recordIllegalBoardMove : undefined}
          onDragActiveChange={setPieceHeld}
        />

        {/* One line kept for the message whether or not there is one, so a
            rejected move does not push the keypad down under the player's
            finger, and accepting the next one does not pull it back up. The
            message goes as soon as the player edits the move, as on the
            web. */}
        <Text
          numberOfLines={1}
          accessibilityLiveRegion="polite"
          style={[styles.errorText, { color: colors.destructive }]}
        >
          {game.error?.kind === "invalid-move"
            ? t("aiGame.session.invalidMoveWithInput", {
                move: game.error.input,
              })
            : game.aiMoveFailed
              ? t("aiGame.session.aiMoveFailed")
              : ""}
        </Text>

        {/* The controls stay in place for the whole game, only disabled, as
            on the web: the keypad through the AI's turn (that the AI is
            working is said on the board and in the top row), and everything
            once the game is over, with the result laid over it. Taking them
            away moved what was below them on every move, and collapsed the
            screen at the end. */}
        <View>
          <ButtonInput
            fen={game.currentFen}
            onSubmit={submitMove}
            onEdit={game.clearInvalidMove}
            disabled={
              ai.isLoading ||
              !game.isPlayerTurn ||
              game.isAiThinking ||
              game.gameStatus !== "in_progress"
            }
          />

          {game.gameStatus === "in_progress" && game.aiMoveFailed && (
            <Button
              title={t("aiGame.session.retry")}
              icon="refresh"
              onPress={game.retryAiMove}
              style={styles.retry}
            />
          )}

          {finished && game.playerResult && game.termination && (
            <View
              accessibilityLiveRegion="polite"
              style={styles.gameOverOverlay}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.gameOverScrim,
                  { backgroundColor: colors.page },
                ]}
              />
              <ResultHeadline
                result={game.playerResult}
                termination={game.termination}
                size="md"
              />
              <Button
                title={t("aiGame.result.nextAction")}
                onPress={() => setFinishSheetOpen(true)}
                style={styles.nextAction}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* The moves stay off the screen while playing: a list always in view
          is the game written out, which blindfold play takes away. */}
      <BottomSheet
        visible={movesOpen}
        onClose={() => setMovesOpen(false)}
        title={t("aiGame.session.moves")}
      >
        <MoveHistory moves={game.moves} startingFen={start.startingFen} />
      </BottomSheet>
      {game.playerResult && game.termination ? (
        <GameFinishSheet
          visible={finishSheetOpen}
          onClose={() => setFinishSheetOpen(false)}
          result={game.playerResult}
          termination={game.termination}
          playerColor={playerColor}
          skillLevel={skillLevel}
          moveCount={game.moves.length}
          earnedExp={exp?.earnedExp}
          // A game with no move is never saved (`differsFromStart`), so
          // there is no page to review.
          onReview={game.moves.length > 0 ? reviewGame : undefined}
          onPlayAgain={() => {
            setFinishSheetOpen(false);
            closeToSetup();
          }}
          onBackToMenu={() => {
            setFinishSheetOpen(false);
            closeToMenu();
          }}
        />
      ) : null}
      <GameMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        canUndo={game.canUndo}
        canResign={game.canResign}
        onUndo={confirmUndo}
        onResign={confirmResign}
      />
      {/* This game's settings, changed mid-game: they are the session's own
          copy, so the global preferences stay as they were. */}
      <BottomSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("common.gameSettings")}
      >
        <ListSection>
          {perGameSettingRows({
            t,
            preferences,
            onChange: updatePreferences,
          })}
        </ListSection>
      </BottomSheet>
    </Screen>
  );
}

/**
 * How long a finished game's board is left alone before the finish sheet
 * comes up over it: long enough to take in the final position and its mark,
 * short enough that the sheet still reads as the answer to the last move.
 */
const FINISH_SHEET_DELAY_MS = 800;

/** The error line's height, kept whether or not a message is showing. */
const ERROR_LINE_HEIGHT = 20;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  // Tight on purpose: the board and the keypad have to fit
  // on a phone screen together, so the player never scrolls to enter a move.
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    lineHeight: ERROR_LINE_HEIGHT,
    minHeight: ERROR_LINE_HEIGHT,
    textAlign: "center",
  },
  retry: {
    marginTop: spacing.sm,
  },
  // The status sits between the × and the board controls. The row takes
  // the top bar's whole trailing slot so the status can centre in it.
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    // Four 44pt buttons share the row with the status; at the wider gap the
    // level under it ("Level 5 (1200 ELO)") was cut off on a 402pt phone.
    // The buttons' own 44pt squares keep them apart enough to tap.
    gap: spacing.xs,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  gameOverScrim: {
    opacity: 0.85,
  },
  nextAction: {
    marginTop: spacing.md,
  },
});
