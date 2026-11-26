import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { RankRequirement } from "@blindfold-chess/features/dojo-ranks";
import type { RankJourney } from "@blindfold-chess/features/dojo-journey";

import { ListIcon, ListRow, ListSection } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { useTheme } from "../../theme";
import { requirementLabel, requirementTarget } from "./requirements";

/**
 * What a rank asks for, one row per requirement, each marked met once it
 * is. The rows are the exam stage of the rank's journey, so a row is met
 * exactly when that stage counts it (and every row of a rank already held
 * is). A challenge row opens the module's setup screen, where the
 * challenge starts; an exam-problem row opens the rank's exam; a
 * requirement the app cannot meet (publishing a game) opens the web page
 * where it is met, and says so.
 *
 * The screen passes the journey from its own `useDojoJourney`, so a screen
 * that also shows the stages reads and syncs the progress once.
 */
export function RankRequirementList({
  journey,
  title,
}: {
  readonly journey: RankJourney;
  readonly title?: string;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const slug = journey.rank;
  const held = journey.standing === "achieved";
  const rows = journey.steps.flatMap((step) =>
    step.kind === "requirement"
      ? [{ requirement: step.requirement, met: step.done }]
      : [],
  );
  const hasWebOnly = rows.some(
    ({ requirement }) => requirementTarget(requirement).kind === "web",
  );

  const subtitleOf = (requirement: RankRequirement, met: boolean) => {
    if (met) return t("dojo.met");
    if (requirement.type === "exam_problem") return t("dojo.exam.hint");
    return requirementTarget(requirement).kind === "practice"
      ? t("dojo.challengeHint")
      : t("dojo.webOnly");
  };

  return (
    <ListSection
      title={title}
      footer={hasWebOnly && !held ? t("dojo.webOnlyNote") : undefined}
    >
      {rows.map(({ requirement, met }, index) => {
        const target = requirementTarget(requirement);
        return (
          <ListRow
            key={index}
            testID={`requirement-${slug}-${index}`}
            leading={
              <ListIcon
                ionicon={
                  met
                    ? "checkmark"
                    : target.kind === "web"
                      ? "globe-outline"
                      : requirement.type === "exam_problem"
                        ? "school-outline"
                        : "stopwatch-outline"
                }
                tint={met ? colors.success : undefined}
              />
            }
            title={requirementLabel(requirement, t)}
            subtitle={subtitleOf(requirement, met)}
            accessory={target.kind === "web" ? "external" : "chevron"}
            onPress={() =>
              target.kind === "practice"
                ? router.push(target.pathname as Href)
                : openWebPage(target.path, i18n.language)
            }
          />
        );
      })}
    </ListSection>
  );
}
