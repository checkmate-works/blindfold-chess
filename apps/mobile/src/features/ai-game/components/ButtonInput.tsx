import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Delete, Trash2 } from "lucide-react-native";

import type {
  CastlingToken,
  NotationChar,
} from "@blindfold-chess/features/ai-game/notation-input";
import { useNotationInput } from "@blindfold-chess/features/ai-game/notation-input/client";
import type { AlgebraicNotation } from "@blindfold-chess/types";

import { CoordinateInput } from "../../../components";
import { useGamePreferences } from "../../../lib/game-preferences";
import {
  borderRadius,
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  touchTarget,
  useTheme,
} from "../../../theme";
import { ChessPiece } from "./ChessPiece";

type ButtonInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
};

type PieceLabelKey = "king" | "queen" | "rook" | "bishop" | "knight";

const PIECE_BUTTONS: ReadonlyArray<{
  char: NotationChar;
  type: "k" | "q" | "r" | "b" | "n";
  labelKey: PieceLabelKey;
}> = [
  { char: "K", type: "k", labelKey: "king" },
  { char: "Q", type: "q", labelKey: "queen" },
  { char: "R", type: "r", labelKey: "rook" },
  { char: "B", type: "b", labelKey: "bishop" },
  { char: "N", type: "n", labelKey: "knight" },
];

const ANNOTATION_BUTTONS: ReadonlyArray<{
  char: NotationChar;
  labelKey: "check" | "promotion" | "checkmate";
}> = [
  { char: "+", labelKey: "check" },
  { char: "=", labelKey: "promotion" },
  { char: "#", labelKey: "checkmate" },
];

const CASTLING_BUTTONS: ReadonlyArray<{
  move: CastlingToken;
  labelKey: "kingside" | "queenside";
}> = [
  { move: "O-O", labelKey: "kingside" },
  { move: "O-O-O", labelKey: "queenside" },
];

const PIECE_ICON_SIZE = 24;
const ACTION_ICON_SIZE = 20;

/**
 * The SAN keypad, laid out like the web's `ButtonInput`: piece letters and
 * ×, the file row, the rank row, `+ = #` with the two castlings, then the
 * typed move with backspace, clear and submit.
 *
 * @description
 * Every key appends its characters to one string, which is what submit
 * sends. Nothing is staged or toggled, so there is no separate
 * disambiguation step: `Nbd2` or `R1e2` is typed key by key like any other
 * move, the same way on both apps.
 *
 * A rejected move stays on screen so the player can backspace and fix it
 * (`submit` keeps it); an accepted one changes `fen`, which clears the
 * input.
 *
 * The piece icons take the colour of the side to move, read from `fen`,
 * because whoever is typing is always that side.
 */
export function ButtonInput({
  fen,
  onSubmit,
  disabled = false,
}: ButtonInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const showIcons = preferences.buttonInputPieceLabel !== "text";
  const pieceColor = fen.split(" ")[1] === "b" ? "b" : "w";

  const n = useNotationInput({ fen, onSubmit });
  const input = n.state.input;
  const canSubmit = n.isSubmittable && !disabled;

  return (
    <View style={styles.container}>
      {/* Row 1: pieces + capture */}
      <View style={styles.row}>
        {PIECE_BUTTONS.map(({ char, type, labelKey }) => (
          <Key
            key={char}
            onPress={() => n.appendChar(char)}
            disabled={disabled}
            label={t(`buttonInput.piece.${labelKey}`)}
            testID={`move-piece-${char}`}
            fill
          >
            {showIcons ? (
              <ChessPiece
                type={type}
                color={pieceColor}
                size={PIECE_ICON_SIZE}
              />
            ) : (
              <KeyText>{char}</KeyText>
            )}
          </Key>
        ))}
        <Key
          onPress={() => n.appendChar("x")}
          disabled={disabled}
          label={t("buttonInput.symbol.capture")}
          testID="move-capture"
          fill
        >
          <KeyText>×</KeyText>
        </Key>
      </View>

      {/* Rows 2-3: files, ranks */}
      <CoordinateInput
        onFilePress={(file) => n.appendChar(file as NotationChar)}
        onRankPress={(rank) => n.appendChar(rank as NotationChar)}
        disabled={disabled}
      />

      {/* Row 4: annotations + castling */}
      <View style={[styles.row, styles.annotationRow]}>
        <View style={styles.group}>
          {ANNOTATION_BUTTONS.map(({ char, labelKey }) => (
            <Key
              key={char}
              onPress={() => n.appendChar(char)}
              disabled={disabled}
              label={t(`buttonInput.symbol.${labelKey}`)}
            >
              <KeyText>{char}</KeyText>
            </Key>
          ))}
        </View>
        <View style={styles.group}>
          {CASTLING_BUTTONS.map(({ move, labelKey }) => (
            <Key
              key={move}
              onPress={() => n.appendCastling(move)}
              disabled={disabled}
              label={t(`buttonInput.castling.${labelKey}`)}
              wide
            >
              <KeyText small>{move}</KeyText>
            </Key>
          ))}
        </View>
      </View>

      {/* Row 5: typed move + backspace + clear + submit */}
      <View style={[styles.row, styles.actionRow]}>
        <View
          style={[
            styles.preview,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            numberOfLines={1}
            testID="move-preview"
            style={[styles.previewText, { color: colors.foreground }]}
          >
            {input}
          </Text>
        </View>
        <Key
          onPress={n.backspace}
          disabled={disabled}
          label={t("buttonInput.action.backspace")}
          action
        >
          <Delete size={ACTION_ICON_SIZE} color={colors.foreground} />
        </Key>
        <Key
          onPress={n.clear}
          disabled={disabled}
          label={t("buttonInput.action.clear")}
          action
        >
          <Trash2 size={ACTION_ICON_SIZE - 2} color={colors.foreground} />
        </Key>
        <Key
          onPress={n.submit}
          disabled={!canSubmit}
          label={t("buttonInput.action.submit")}
          testID="move-submit"
          action
          primary
        >
          <Check
            size={ACTION_ICON_SIZE}
            color={
              canSubmit ? colors.primaryForeground : colors.mutedForeground
            }
          />
        </Key>
      </View>
    </View>
  );
}

/**
 * One keypad key. While pressed only its fill changes (the app's flat
 * look); a disabled key fades to half, like the web's `disabled:opacity-50`.
 */
function Key({
  onPress,
  disabled,
  label,
  testID,
  fill,
  wide,
  action,
  primary,
  children,
}: {
  onPress: () => void;
  disabled: boolean;
  label: string;
  testID?: string;
  /** Takes an equal share of the row, capped at the touch target. */
  fill?: boolean;
  /** Sized to its label (the castling keys). */
  wide?: boolean;
  /** The larger keys beside the typed move. */
  action?: boolean;
  /** The submit key. */
  primary?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.key,
        fill && styles.keyFill,
        wide && styles.keyWide,
        action && styles.keyAction,
        {
          borderColor: colors.border,
          backgroundColor: primary
            ? disabled
              ? colors.muted
              : pressed
                ? colors.primaryPressed
                : colors.primary
            : pressed
              ? colors.muted
              : colors.background,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function KeyText({ small, children }: { small?: boolean; children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.keyText,
        small && styles.keyTextSmall,
        { color: colors.foreground },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // The web's `flex flex-col gap-3`.
  container: {
    gap: spacing.sm + spacing.xs,
  },
  // The web's `flex gap-2 justify-center`.
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  // The web's `gap-4` between the annotation and castling groups.
  annotationRow: {
    gap: spacing.md,
    alignItems: "center",
  },
  group: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  // The web's `mt-2 items-center`.
  actionRow: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  // The web's `w-11 h-11 rounded-md border`.
  key: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyFill: {
    flex: 1,
    minWidth: 0,
    maxWidth: touchTarget.minSize,
  },
  // The web's `px-3`.
  keyWide: {
    width: "auto",
    minWidth: touchTarget.minSize,
    paddingHorizontal: spacing.md,
  },
  // The web's `w-14 h-14 rounded-lg`.
  keyAction: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  keyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  keyTextSmall: {
    fontSize: fontSize.xs,
  },
  // The web's `px-4 h-14 rounded-lg font-mono text-lg`.
  preview: {
    flex: 1,
    height: 56,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  previewText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: monoFont,
  },
});
