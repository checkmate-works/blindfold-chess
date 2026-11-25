import type { ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

import {
  fontSize,
  fontWeight,
  spacing,
  touchTarget,
  type ThemeColors,
} from "../../../../theme";
import type { useMoveInput } from "../../hooks/useMoveInput";
import { CheckboxPill } from "../CheckboxPill";
import { ToggleButton } from "../ToggleButton";
import { FILES, RANKS } from "@blindfold-chess/types";

import { PROMOTION_PIECES } from "./constants";

type MoveInput = ReturnType<typeof useMoveInput>;

/**
 * The destination-square entry rows of the button input (everything below
 * the piece/castling selectors): the file row, the pawn-capture toggle and
 * target-file row, the rank row, the promotion row, and the check toggle.
 * These rows read most of the structured input surface and share its
 * visibility rules (showRankRow / showCheckToggle etc. — pure selectors from
 * the notation-input state machine), so they move together as one unit.
 */
export function TargetSquareRows({
  input,
  disabled,
  colors,
  fitWidth,
}: {
  input: MoveInput;
  disabled?: boolean;
  colors: ThemeColors;
  /** See `ButtonInput`'s `fitWidth`. */
  fitWidth?: boolean;
}) {
  return (
    <>
      {/* File Row */}
      <KeyRow fit={fitWidth}>
        {FILES.map((file) => (
          <ToggleButton
            key={file}
            label={file}
            testID={`move-file-${file}`}
            isSelected={
              input.isPawnCaptureMode
                ? input.targetFile === file
                : input.selectedFile === file
            }
            onPress={() => input.handleFileSelect(file)}
            disabled={
              disabled ||
              (input.isPawnCaptureMode && input.selectedFile === file)
            }
            colors={colors}
            fill={fitWidth}
          />
        ))}
      </KeyRow>

      {/* Capture Toggle (Pawn Mode) - shown when no piece selected and file selected */}
      {!input.selectedPiece && input.selectedFile !== null && (
        <CheckboxPill
          label="x"
          isChecked={input.isCapture}
          onPress={input.handleCaptureToggle}
          disabled={disabled}
          colors={colors}
        />
      )}

      {/* Target File Row (Pawn Capture Mode) */}
      {input.isPawnCaptureMode && (
        <KeyRow fit={fitWidth}>
          {FILES.map((file) => (
            <ToggleButton
              key={`target-${file}`}
              label={file}
              isSelected={input.targetFile === file}
              onPress={() => input.handleFileSelect(file)}
              disabled={disabled || input.selectedFile === file}
              colors={colors}
              fill={fitWidth}
            />
          ))}
        </KeyRow>
      )}

      {/* Rank Row */}
      {input.showRankRow && (
        <KeyRow fit={fitWidth}>
          {RANKS.map((rank) => (
            <ToggleButton
              key={rank}
              label={rank}
              isSelected={input.selectedRank === rank}
              onPress={() => input.handleRankSelect(rank)}
              testID={`move-rank-${rank}`}
              disabled={disabled}
              colors={colors}
              fill={fitWidth}
            />
          ))}
        </KeyRow>
      )}

      {/* Promotion Row - show when promotion is available */}
      {input.showPromotion && (
        <View style={styles.row}>
          <View style={styles.equalsSign}>
            <Text
              style={[styles.equalsSignText, { color: colors.mutedForeground }]}
            >
              =
            </Text>
          </View>
          {PROMOTION_PIECES.map((piece) => (
            <ToggleButton
              key={`promo-${piece}`}
              label={piece.toUpperCase()}
              isSelected={input.promotionPiece === piece}
              onPress={() => input.handlePromotionSelect(piece)}
              disabled={disabled}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Check Toggle */}
      {input.showCheckToggle && (
        <CheckboxPill
          label="+"
          isChecked={input.isCheck}
          onPress={input.handleCheckToggle}
          disabled={disabled}
          colors={colors}
        />
      )}
    </>
  );
}

/** A row of eight file or rank keys: scrolled sideways, or with `fit` stretched to the width. */
function KeyRow({ fit, children }: { fit?: boolean; children: ReactNode }) {
  return fit ? (
    <View style={styles.fitRow}>{children}</View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fitRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  equalsSign: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: "center",
    justifyContent: "center",
  },
  equalsSignText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
