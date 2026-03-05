import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { PieceType } from "@blindfold-chess/icons";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";
import { useMoveInput } from "../hooks/useMoveInput";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import { ChessPiece } from "./ChessPiece";
import { ToggleButton } from "./ToggleButton";
import { CheckboxPill } from "./CheckboxPill";

const PIECES = ["K", "Q", "R", "B", "N"] as const;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

const PIECE_TYPE_MAP: Record<(typeof PIECES)[number], PieceType> = {
  K: "k",
  Q: "q",
  R: "r",
  B: "b",
  N: "n",
};

const PIECE_ICON_SIZE = 24;

type ButtonInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
};

export function ButtonInput({ fen, onSubmit, disabled }: ButtonInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const input = useMoveInput({ fen, onSubmit });

  const hasSelections =
    input.selectedPiece !== null ||
    input.selectedFile !== null ||
    input.selectedRank !== null ||
    input.isCapture ||
    input.isCheck ||
    input.castling !== null ||
    input.sourceFile !== null ||
    input.sourceRank !== null;

  return (
    <View style={styles.container}>
      {/* Piece Row - show when: not castling AND (no file selected OR piece already selected) */}
      {!input.castling &&
        (input.selectedFile === null || input.selectedPiece !== null) && (
          <View style={styles.row}>
            {PIECES.map((piece) => (
              <TouchableOpacity
                key={piece}
                onPress={() => input.handlePieceSelect(piece)}
                disabled={disabled}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor:
                      input.selectedPiece === piece
                        ? colors.primary
                        : colors.card,
                    borderColor:
                      input.selectedPiece === piece
                        ? colors.primary
                        : colors.border,
                    opacity: disabled ? 0.5 : 1,
                  },
                ]}
              >
                <ChessPiece
                  type={PIECE_TYPE_MAP[piece]}
                  color="w"
                  size={PIECE_ICON_SIZE}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

      {/* Castling Row - show when: no piece selected AND no file selected */}
      {!input.selectedPiece && input.selectedFile === null && (
        <View style={styles.row}>
          <ToggleButton
            label="O-O"
            isSelected={input.castling === "O-O"}
            onPress={() => input.handleCastlingSelect("O-O")}
            disabled={disabled}
            colors={colors}
            wide
          />
          <ToggleButton
            label="O-O-O"
            isSelected={input.castling === "O-O-O"}
            onPress={() => input.handleCastlingSelect("O-O-O")}
            disabled={disabled}
            colors={colors}
            wide
          />
        </View>
      )}

      {/* Piece mode: Capture toggle + Disambiguation (shown when piece is selected) */}
      {input.selectedPiece && (
        <>
          {/* Disambiguation Toggle */}
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => input.setIsAmbiguous(!input.isAmbiguous)}
              disabled={disabled}
              style={[
                styles.disambiguationToggle,
                {
                  backgroundColor: input.isAmbiguous
                    ? colors.primary + "1A"
                    : "transparent",
                  borderColor: input.isAmbiguous
                    ? colors.primary
                    : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.disambiguationToggleText,
                  {
                    color: input.isAmbiguous
                      ? colors.primary
                      : colors.mutedForeground,
                  },
                ]}
              >
                {t("aiGame.session.disambiguation")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Disambiguation Panel */}
          {input.isAmbiguous && (
            <View
              style={[
                styles.disambiguationPanel,
                {
                  backgroundColor: colors.muted + "4D",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.disambiguationLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("aiGame.session.sourceLabel")}
              </Text>
              {/* Source File */}
              <View style={styles.row}>
                {FILES.map((file) => (
                  <ToggleButton
                    key={`src-file-${file}`}
                    label={file}
                    isSelected={input.sourceFile === file}
                    onPress={() => input.handleSourceFileSelect(file)}
                    disabled={disabled}
                    colors={colors}
                    small
                  />
                ))}
              </View>
              {/* Source Rank */}
              <View style={styles.row}>
                {RANKS.map((rank) => (
                  <ToggleButton
                    key={`src-rank-${rank}`}
                    label={rank}
                    isSelected={input.sourceRank === rank}
                    onPress={() => input.handleSourceRankSelect(rank)}
                    disabled={disabled}
                    colors={colors}
                    small
                  />
                ))}
              </View>
            </View>
          )}

          {/* Capture Toggle (Piece Mode) */}
          <CheckboxPill
            label="x"
            isChecked={input.isCapture}
            onPress={input.handleCaptureToggle}
            disabled={disabled}
            colors={colors}
          />
        </>
      )}

      {/* Non-castling rows: file, pawn capture, rank, promotion, check */}
      {!input.castling && (
        <>
          {/* File Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {FILES.map((file) => (
                <ToggleButton
                  key={file}
                  label={file}
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
                />
              ))}
            </View>
          </ScrollView>

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {FILES.map((file) => (
                  <ToggleButton
                    key={`target-${file}`}
                    label={file}
                    isSelected={input.targetFile === file}
                    onPress={() => input.handleFileSelect(file)}
                    disabled={disabled || input.selectedFile === file}
                    colors={colors}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* Rank Row - show when: file selected AND (not pawn capture OR target file selected) */}
          {input.selectedFile !== null &&
            (!input.isPawnCaptureMode || input.targetFile !== null) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {RANKS.map((rank) => (
                    <ToggleButton
                      key={rank}
                      label={rank}
                      isSelected={input.selectedRank === rank}
                      onPress={() => input.handleRankSelect(rank)}
                      disabled={disabled}
                      colors={colors}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

          {/* Promotion Row - show when promotion is available */}
          {input.showPromotion && (
            <View style={styles.row}>
              <View style={styles.equalsSign}>
                <Text
                  style={[
                    styles.equalsSignText,
                    { color: colors.mutedForeground },
                  ]}
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

          {/* Check Toggle - show when: rank selected AND (not promotion OR promotion piece selected) */}
          {input.selectedRank !== null &&
            (!input.showPromotion || input.promotionPiece !== null) && (
              <CheckboxPill
                label="+"
                isChecked={input.isCheck}
                onPress={input.handleCheckToggle}
                disabled={disabled}
                colors={colors}
              />
            )}
        </>
      )}

      {/* Preview + Actions (bottom bar like web) */}
      <View style={styles.actionRow}>
        <View
          style={[
            styles.previewBar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.previewText,
              {
                color: input.previewText
                  ? colors.foreground
                  : colors.mutedForeground,
              },
            ]}
          >
            {input.previewText || t("aiGame.session.movePreview")}
          </Text>
          {hasSelections && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={input.resetAll}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("aiGame.session.clear")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor:
                input.isSubmittable && !disabled
                  ? colors.primary
                  : colors.muted,
              borderColor:
                input.isSubmittable && !disabled
                  ? colors.primary
                  : colors.border,
            },
          ]}
          onPress={input.handleSubmit}
          disabled={!input.isSubmittable || disabled}
        >
          <Text
            style={[
              styles.submitButtonText,
              {
                color:
                  input.isSubmittable && !disabled
                    ? colors.primaryForeground
                    : colors.mutedForeground,
              },
            ]}
          >
            {t("aiGame.session.submit")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  toggleButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  disambiguationToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  disambiguationToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  disambiguationPanel: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  disambiguationLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    textTransform: "uppercase",
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
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  previewBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minSize + spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: "monospace",
  },
  clearButton: {
    padding: spacing.sm,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
  },
  submitButton: {
    minWidth: touchTarget.minSize + spacing.sm,
    minHeight: touchTarget.minSize + spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
