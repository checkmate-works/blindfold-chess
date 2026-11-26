import { Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card } from "../../../components";
import { useTheme, fontWeight, spacing } from "../../../theme";

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
 *
 * It follows the flat surface rule: a surface laid on the page casts no
 * shadow, so `shadow="none"` is passed explicitly and the card stays flat
 * whatever `Card`'s default is. The title is 17pt bold, the same weight as
 * the other home cards' headings, and the large button spans the card.
 */
export function AiGameCard({ buttonTitle, onPress }: AiGameCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={styles.card} padding="md" shadow="none">
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("aiGame.title")}
      </Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {t("aiGame.description")}
      </Text>
      <Button title={buttonTitle} onPress={onPress} size="lg" fullWidth />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  title: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});
