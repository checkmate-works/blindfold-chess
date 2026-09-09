import { Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card } from "../../../components";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  shadows,
} from "../../../theme";

type AiGameCardProps = {
  /** The call to action; the Home and Play tabs word it differently. */
  buttonTitle: string;
  onPress: () => void;
};

/**
 * The "play against the AI" card: the feature's title and description over
 * a full-width button.
 *
 * Both the Home tab and the Play tab lead with this card, and each had the
 * three elements and their styles written out; only the button's wording
 * differs.
 */
export function AiGameCard({ buttonTitle, onPress }: AiGameCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={styles.card} padding="lg">
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("aiGame.title")}
      </Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {t("aiGame.description")}
      </Text>
      <Button title={buttonTitle} onPress={onPress} size="md" fullWidth />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
});
