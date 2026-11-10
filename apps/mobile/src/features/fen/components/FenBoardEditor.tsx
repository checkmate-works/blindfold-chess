import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  EMPTY_BOARD_FEN,
  PALETTE_PIECES,
  applyBoardTap,
  type PalettePiece,
} from "@blindfold-chess/features/fen-practice";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceColor, PieceType } from "@blindfold-chess/icons";

import { Button } from "../../../components";
import {
  useTheme,
  spacing,
  borderRadius,
  fontSize,
  touchTarget,
} from "../../../theme";
import { FenBoard } from "./FenBoard";

type FenBoardEditorProps = {
  fen: string;
  onFenChange: (fen: string) => void;
  /** Initial orientation; the player can flip it afterwards. */
  initialFlipped?: boolean;
};

const WHITE_PIECES = PALETTE_PIECES.filter((p) => p === p.toUpperCase());
const BLACK_PIECES = PALETTE_PIECES.filter((p) => p === p.toLowerCase());

/**
 * The FEN drill's recreation board on a phone. The web editor drags pieces
 * from a palette; dragging onto 40-point squares is error-prone on a touch
 * screen, so here the player picks a piece (or the eraser) once and taps
 * squares to place it. Tapping a square that already holds the selected
 * piece removes it, and "clear" empties the board.
 *
 * Only piece placement is edited: the side to move, castling and the other
 * FEN fields are kept from `fen`, because the drill scores placement alone.
 */
export function FenBoardEditor({
  fen,
  onFenChange,
  initialFlipped = false,
}: FenBoardEditorProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PalettePiece | null>("K");
  const [flipped, setFlipped] = useState(initialFlipped);

  return (
    <View style={styles.container}>
      <FenBoard
        fen={fen}
        flipped={flipped}
        onSquarePress={(square) =>
          onFenChange(applyBoardTap(fen, square, selected))
        }
      />

      <PaletteRow
        label={t("fen.session.whitePieces")}
        pieces={WHITE_PIECES}
        selected={selected}
        onSelect={setSelected}
      />
      <PaletteRow
        label={t("fen.session.blackPieces")}
        pieces={BLACK_PIECES}
        selected={selected}
        onSelect={setSelected}
      />

      <View style={styles.actions}>
        <Button
          title={t("fen.session.eraser")}
          onPress={() => setSelected(null)}
          variant={selected === null ? "primary" : "outline"}
          size="sm"
        />
        <Button
          title={t("fen.session.clearBoard")}
          onPress={() => onFenChange(EMPTY_BOARD_FEN)}
          variant="outline"
          size="sm"
        />
        <Button
          title={t("fen.session.flipBoard")}
          onPress={() => setFlipped((prev) => !prev)}
          variant="outline"
          size="sm"
        />
      </View>
    </View>
  );
}

function PaletteRow({
  label,
  pieces,
  selected,
  onSelect,
}: {
  label: string;
  pieces: readonly PalettePiece[];
  selected: PalettePiece | null;
  onSelect: (piece: PalettePiece) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.paletteSection}>
      <Text style={[styles.paletteLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={styles.paletteRow}>
        {pieces.map((piece) => {
          const isSelected = piece === selected;
          const lower = piece.toLowerCase();
          return (
            <TouchableOpacity
              key={piece}
              onPress={() => onSelect(piece)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={piece}
              style={[
                styles.paletteItem,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.secondary : colors.card,
                },
              ]}
            >
              <ChessPieceIcon
                type={lower as PieceType}
                color={(piece === lower ? "b" : "w") as PieceColor}
                size={touchTarget.minSize * 0.75}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  paletteSection: {
    gap: spacing.xs,
  },
  paletteLabel: {
    fontSize: fontSize.sm,
  },
  paletteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paletteItem: {
    width: touchTarget.minSize + spacing.sm,
    height: touchTarget.minSize + spacing.sm,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
});
