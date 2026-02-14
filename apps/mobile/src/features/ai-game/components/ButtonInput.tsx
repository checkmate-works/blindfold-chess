import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
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

const PIECES = ["K", "Q", "R", "B", "N"] as const;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

type ButtonInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
};

export function ButtonInput({ fen, onSubmit, disabled }: ButtonInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const input = useMoveInput({ fen, onSubmit });

  return (
    <View style={styles.container}>
      {/* Preview */}
      <View
        style={[
          styles.preview,
          { backgroundColor: colors.card, borderColor: colors.border },
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
      </View>

      {/* Piece Row */}
      <View style={styles.row}>
        {PIECES.map((piece) => (
          <ToggleButton
            key={piece}
            label={piece}
            isSelected={input.selectedPiece === piece}
            onPress={() => input.handlePieceSelect(piece)}
            disabled={disabled}
            colors={colors}
          />
        ))}
      </View>

      {/* Castling Row */}
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

      {/* Disambiguation (source file/rank) */}
      {input.selectedPiece && (
        <View style={styles.disambiguationContainer}>
          <Text
            style={[styles.sectionLabel, { color: colors.mutedForeground }]}
          >
            {t("aiGame.session.disambiguation")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {FILES.map((file) => (
                <ToggleButton
                  key={`src-${file}`}
                  label={file}
                  isSelected={input.sourceFile === file}
                  onPress={() => input.handleSourceFileSelect(file)}
                  disabled={disabled}
                  colors={colors}
                  small
                />
              ))}
              {RANKS.map((rank) => (
                <ToggleButton
                  key={`src-${rank}`}
                  label={rank}
                  isSelected={input.sourceRank === rank}
                  onPress={() => input.handleSourceRankSelect(rank)}
                  disabled={disabled}
                  colors={colors}
                  small
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Capture Toggle */}
      <View style={styles.row}>
        <ToggleButton
          label="x"
          isSelected={input.isCapture}
          onPress={input.handleCaptureToggle}
          disabled={disabled}
          colors={colors}
        />
        <ToggleButton
          label="+"
          isSelected={input.isCheck}
          onPress={input.handleCheckToggle}
          disabled={disabled}
          colors={colors}
        />
      </View>

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
              disabled={disabled}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>

      {/* Rank Row */}
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

      {/* Promotion Row */}
      {input.showPromotion && (
        <View style={styles.row}>
          {PROMOTION_PIECES.map((piece) => (
            <ToggleButton
              key={`promo-${piece}`}
              label={`=${piece.toUpperCase()}`}
              isSelected={input.promotionPiece === piece}
              onPress={() => input.handlePromotionSelect(piece)}
              disabled={disabled}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Submit / Clear Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
          ]}
          onPress={input.resetAll}
          disabled={disabled}
        >
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            {t("aiGame.session.clear")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
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
              styles.actionText,
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

type ToggleButtonProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  wide?: boolean;
  small?: boolean;
};

function ToggleButton({
  label,
  isSelected,
  onPress,
  disabled,
  colors,
  wide,
  small,
}: ToggleButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toggleButton,
        small && styles.toggleButtonSmall,
        wide && styles.toggleButtonWide,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.toggleText,
          small && styles.toggleTextSmall,
          {
            color: isSelected ? colors.primaryForeground : colors.foreground,
            fontWeight: isSelected ? fontWeight.bold : fontWeight.normal,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  preview: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  previewText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: "monospace",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  disambiguationContainer: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    textAlign: "center",
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
  toggleButtonSmall: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  toggleButtonWide: {
    paddingHorizontal: spacing.lg,
  },
  toggleText: {
    fontSize: fontSize.md,
  },
  toggleTextSmall: {
    fontSize: fontSize.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    minHeight: touchTarget.minSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  submitButton: {
    flex: 2,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
