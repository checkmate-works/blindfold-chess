import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  CoordinateKeyRow,
  FILE_KEYS,
  RANK_KEYS,
  coordinateKeypadStyles,
} from "../../../components";
import { useTheme, spacing } from "../../../theme";

type SquareInputProps = {
  selectedFile: string | null;
  disabled: boolean;
  onFilePress: (file: string) => void;
  onRankPress: (rank: string) => void;
};

export function SquareInput({
  selectedFile,
  disabled,
  onFilePress,
  onRankPress,
}: SquareInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {!disabled && (
        <Text
          style={[
            coordinateKeypadStyles.stepIndicator,
            { color: colors.mutedForeground },
          ]}
        >
          {selectedFile === null
            ? t("routePlanner.session.selectFile")
            : t("routePlanner.session.selectRank")}
        </Text>
      )}

      {/* The chosen file stays highlighted while the rank is picked. */}
      <CoordinateKeyRow
        keys={FILE_KEYS}
        enabled={!disabled}
        activeKey={selectedFile}
        onPress={onFilePress}
      />

      <CoordinateKeyRow
        keys={RANK_KEYS}
        enabled={!disabled && selectedFile !== null}
        onPress={onRankPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
