import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  rankStanding,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { RankGoalCard } from "../dojo/RankGoalCard";
import { useDojoJourney } from "../dojo/use-dojo-journey";
import { spacing } from "../../theme";

/**
 * A rank's introduction in a half-height sheet, opened from a practice
 * card's rank pill: what the rank certifies and where the player stands on
 * it (`RankGoalCard`), with a button on to the full rank screen.
 *
 * @description
 * The practice list is where a player first meets a rank's name, usually
 * before they have opened the dojo, so the pill answers "what is 5kyu?"
 * where it is asked, without leaving the list. The sheet holds nothing
 * that navigates on its own (the card's stage cells and the requirement
 * rows are links, so they are left to the rank screen): its one way out
 * closes it first and then pushes the rank screen.
 *
 * `slug` undefined keeps the sheet closed. The last rank is kept while it
 * closes, so the content does not vanish mid-animation.
 */
export function RankSheet({
  slug,
  lastSlug,
  onClose,
}: {
  /** The rank to show; undefined closes the sheet. */
  readonly slug: RankSlug | undefined;
  /** The rank drawn while closing (the last one opened). */
  readonly lastSlug: RankSlug | undefined;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { highest } = useDojoJourney();
  const shown = slug ?? lastSlug;

  return (
    <BottomSheet
      visible={slug !== undefined}
      onClose={onClose}
      footer={
        shown && (
          <View style={styles.footer}>
            <Button
              title={t("practice.rankSheet.openRank")}
              fullWidth
              onPress={() => {
                onClose();
                router.push(`/dojo/ranks/${shown}` as Href);
              }}
              testID="practice-rank-sheet-open"
            />
            <Button
              title={t("common.close")}
              variant="ghost"
              fullWidth
              onPress={onClose}
            />
          </View>
        )
      }
    >
      {shown && (
        <RankGoalCard slug={shown} standing={rankStanding(shown, highest)} />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs, paddingTop: spacing.sm },
});
