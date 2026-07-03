import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, spacing } from "../../../theme";
import { useMoveInput } from "../hooks/useMoveInput";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import { CheckboxPill } from "./CheckboxPill";
import { CastlingRow } from "./button-input/CastlingRow";
import { DisambiguationSection } from "./button-input/DisambiguationSection";
import { PieceRow } from "./button-input/PieceRow";
import { PreviewActionBar } from "./button-input/PreviewActionBar";
import { TargetSquareRows } from "./button-input/TargetSquareRows";

type ButtonInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
};

/**
 * The structured SAN keypad: a layout of focused panels (piece row,
 * castling row, disambiguation, destination-square rows, preview bar)
 * whose visibility rules are pure selectors on the shared notation-input
 * state machine, surfaced through `useMoveInput`.
 */
export function ButtonInput({ fen, onSubmit, disabled }: ButtonInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const input = useMoveInput({ fen, onSubmit });

  return (
    <View style={styles.container}>
      {input.showPieceRow && (
        <PieceRow
          selectedPiece={input.selectedPiece}
          onSelect={input.handlePieceSelect}
          disabled={disabled}
          colors={colors}
        />
      )}

      {input.showCastlingRow && (
        <CastlingRow
          castling={input.castling}
          onSelect={input.handleCastlingSelect}
          disabled={disabled}
          colors={colors}
        />
      )}

      {/* Piece mode: disambiguation + capture toggle */}
      {input.selectedPiece && (
        <>
          <DisambiguationSection
            isAmbiguous={input.isAmbiguous}
            onToggleAmbiguous={() => input.setIsAmbiguous(!input.isAmbiguous)}
            sourceFile={input.sourceFile}
            sourceRank={input.sourceRank}
            onSourceFileSelect={input.handleSourceFileSelect}
            onSourceRankSelect={input.handleSourceRankSelect}
            disabled={disabled}
            colors={colors}
            labels={{
              toggle: t("aiGame.session.disambiguation"),
              sourceLabel: t("aiGame.session.sourceLabel"),
            }}
          />

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

      {/* Destination-square entry (file / pawn capture / rank / promotion / check) */}
      {!input.castling && (
        <TargetSquareRows input={input} disabled={disabled} colors={colors} />
      )}

      <PreviewActionBar
        previewText={input.previewText}
        placeholder={t("aiGame.session.movePreview")}
        hasSelections={input.hasSelections}
        onClear={input.resetAll}
        clearLabel={t("aiGame.session.clear")}
        isSubmittable={input.isSubmittable}
        onSubmit={input.handleSubmit}
        submitLabel={t("aiGame.session.submit")}
        disabled={disabled}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
