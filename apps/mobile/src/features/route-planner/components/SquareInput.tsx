import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import { FILES, RANKS, type PieceType } from "@blindfold-chess/types";

import { CoordinateKeyRow } from "../../../components";
import { useTheme } from "../../../theme";

/** The web's read-only piece row: K Q R B N. */
const PIECE_ROW: readonly PieceType[] = ["k", "q", "r", "b", "n"];

type SquareInputProps = {
  /** The piece being routed, lit in the piece row; null lights none. */
  piece: PieceType | null;
  selectedFile: string | null;
  selectedRank: string | null;
  disabled: boolean;
  onFilePress: (file: string) => void;
  onRankPress: (rank: string) => void;
  /** The submit button, under the keys as on the web. */
  children?: ReactNode;
};

/**
 * The keypad, as the web's `PieceCoordinateInput`: a row of the five
 * pieces with the routed one lit (an indicator, not a control), the file
 * keys and the rank keys, each staged key in the primary colour, then the
 * submit button. While disabled the whole block fades to 40% and ignores
 * taps, as the web's does during the verdict.
 */
export function SquareInput({
  piece,
  selectedFile,
  selectedRank,
  disabled,
  onFilePress,
  onRankPress,
  children,
}: SquareInputProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <View style={styles.pieces} accessibilityElementsHidden>
        {PIECE_ROW.map((p) => {
          const active = p === piece;
          return (
            <View
              key={p}
              style={[
                styles.piece,
                active
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    }
                  : {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: 0.5,
                    },
              ]}
            >
              <ChessPieceIcon type={p} color="w" size={24} />
            </View>
          );
        })}
      </View>
      <CoordinateKeyRow
        keys={FILES}
        enabled
        activeKey={selectedFile}
        onPress={onFilePress}
      />
      <CoordinateKeyRow
        keys={RANKS}
        enabled
        activeKey={selectedRank}
        onPress={onRankPress}
      />
      {children && <View style={styles.action}>{children}</View>}
    </View>
  );
}

/**
 * The web's `flex flex-col gap-3`, its `w-9 h-9 rounded-md` piece buttons
 * `gap-2` apart, and the submit row's `pt-4 mt-2`.
 */
const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  pieces: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  piece: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    paddingTop: 12,
  },
});
