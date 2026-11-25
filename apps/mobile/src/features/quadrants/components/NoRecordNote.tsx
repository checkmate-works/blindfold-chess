import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../../components";
import { useTheme } from "../../../theme";

/**
 * Quadrants' stand-in for `ChallengeRulesNote`: this is the one challenge
 * the server does not record, signed in or not, so the sign-in row would
 * promise something a run never gets. The web says so in its challenge
 * rules ("Scores from this exercise will not be recorded…"); here it takes
 * the sign-in row's place, with the trophy greyed out where a recorded
 * challenge shows it green.
 */
export function NoRecordNote() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ListSection>
      <ListRow
        leading={<ListIcon ionicon="trophy" tint={colors.mutedForeground} />}
        title={t("quadrants.setup.notRecorded")}
        testID="quadrants-not-recorded"
      />
    </ListSection>
  );
}
