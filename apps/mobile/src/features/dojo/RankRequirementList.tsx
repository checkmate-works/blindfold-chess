import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  rankStanding,
  type EarnedRankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { ListIcon, ListRow, ListSection } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { useTheme } from "../../theme";
import {
  mobileRankRequirements,
  type MobileRankRequirement,
} from "./mobile-requirements";
import { requirementLabel, requirementTarget } from "./requirements";
import { useCurrentRank } from "./use-current-rank";

/**
 * What a rank asks for, one row per requirement, each marked met once it
 * is (every row of a rank already held counts as met). A challenge row
 * opens the module's setup screen, where the challenge starts; an exam row
 * opens the exam; a requirement the app cannot meet (publishing a game)
 * opens the web page where it is met, and says so.
 */
export function RankRequirementList({
  slug,
  title,
}: {
  readonly slug: EarnedRankSlug;
  readonly title?: string;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { highest, isMet } = useCurrentRank();
  const held = rankStanding(slug, highest) === "achieved";
  const requirements = mobileRankRequirements(slug);
  const hasWebOnly = requirements.some(
    (r) => requirementTarget(r).kind === "web",
  );

  const subtitleOf = (requirement: MobileRankRequirement, met: boolean) => {
    if (met) return t("dojo.met");
    if (requirement.type === "dojo_exam") return t("dojo.exam.hint");
    return requirementTarget(requirement).kind === "practice"
      ? t("dojo.challengeHint")
      : t("dojo.webOnly");
  };

  return (
    <ListSection
      title={title}
      footer={hasWebOnly && !held ? t("dojo.webOnlyNote") : undefined}
    >
      {requirements.map((requirement, index) => {
        const target = requirementTarget(requirement);
        const met = held || isMet(requirement) === true;
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
                      : requirement.type === "dojo_exam"
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
