import { useState } from "react";
import type { ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import {
  PALETTE_PIECES,
  applyBoardTap,
  type PalettePiece,
} from "@blindfold-chess/features/fen-practice";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceColor, PieceType } from "@blindfold-chess/icons";

import { useTheme, spacing, fontSize, withAlpha } from "../../../theme";
import { FenBoard } from "./FenBoard";

type FenBoardEditorProps = {
  fen: string;
  onFenChange: (fen: string) => void;
  /** Orientation; the screen's flip button owns it. */
  flipped: boolean;
};

const WHITE_PIECES = PALETTE_PIECES.filter((p) => p === p.toUpperCase());
const BLACK_PIECES = PALETTE_PIECES.filter((p) => p === p.toLowerCase());

/** The web palette's `w-10 h-10` keys, with a 32pt piece in each. */
const KEY_SIZE = 40;

/**
 * The recreation board as the web's `EditableChessBoard` lays it out: the
 * far side's palette above the board, the near side's below (swapped when
 * the board is flipped), each with a × that removes pieces, and a line
 * between the board and the lower palette saying what a tap does.
 *
 * The web also drags pieces from the palette; dragging onto 40-point
 * squares is error-prone on a touch screen, so here a piece (or the ×) is
 * picked once and every tapped square takes it. Tapping a square that
 * already holds the picked piece removes it.
 *
 * Only piece placement is edited: the side to move, castling and the other
 * FEN fields are kept from `fen`, because the drill scores placement alone.
 */
export function FenBoardEditor({
  fen,
  onFenChange,
  flipped,
}: FenBoardEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<PalettePiece | null>("K");

  const white = { pieces: WHITE_PIECES, label: t("fen.session.whitePieces") };
  const black = { pieces: BLACK_PIECES, label: t("fen.session.blackPieces") };
  const [top, bottom] = flipped ? [white, black] : [black, white];

  return (
    <View style={styles.container}>
      <Palette {...top} selected={selected} onSelect={setSelected} />
      <FenBoard
        fen={fen}
        flipped={flipped}
        onSquarePress={(square) =>
          onFenChange(applyBoardTap(fen, square, selected))
        }
        maxSize={448}
      />
      <Text
        style={[styles.mode, { color: colors.mutedForeground }]}
        accessibilityLiveRegion="polite"
      >
        {selected === null
          ? t("fen.session.removePieceMode")
          : `${t("fen.session.placingPiece")} ${t(`fen.pieceNames.${selected}`)}`}
      </Text>
      <Palette {...bottom} selected={selected} onSelect={setSelected} />
    </View>
  );
}

function Palette({
  label,
  pieces,
  selected,
  onSelect,
}: {
  label: string;
  pieces: readonly PalettePiece[];
  selected: PalettePiece | null;
  onSelect: (piece: PalettePiece | null) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.palette}>
      <Text style={[styles.paletteLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={[styles.paletteRow, { borderColor: colors.border }]}>
        <PaletteKey
          selected={selected === null}
          onPress={() => onSelect(null)}
          accessibilityLabel={t("fen.session.removePiece")}
        >
          <Text style={[styles.remove, { color: colors.foreground }]}>×</Text>
        </PaletteKey>
        {pieces.map((piece) => {
          const lower = piece.toLowerCase();
          return (
            <PaletteKey
              key={piece}
              selected={piece === selected}
              onPress={() => onSelect(piece)}
              accessibilityLabel={t(`fen.pieceNames.${piece}`)}
            >
              <ChessPieceIcon
                type={lower as PieceType}
                color={(piece === lower ? "b" : "w") as PieceColor}
                size={32}
              />
            </PaletteKey>
          );
        })}
      </View>
    </View>
  );
}

/** One palette key: the web's `rounded border-2`, `border-foreground bg-foreground/10` when picked. */
function PaletteKey({
  selected,
  onPress,
  accessibilityLabel,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.key,
        {
          borderColor: selected ? colors.foreground : colors.border,
          backgroundColor: selected
            ? withAlpha(colors.foreground, 0.1)
            : pressed
              ? colors.muted
              : "transparent",
        },
        selected && styles.keySelected,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The web's `gap-4` column.
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  palette: {
    alignItems: "center",
    gap: spacing.sm,
  },
  paletteLabel: {
    fontSize: fontSize.xs,
    fontWeight: "500",
  },
  // `flex gap-1 p-2 border rounded-lg`.
  paletteRow: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // `scale-105`.
  keySelected: {
    transform: [{ scale: 1.05 }],
  },
  remove: {
    fontSize: fontSize.md,
  },
  mode: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
