import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  RANK_REQUIREMENTS,
  type EarnedRankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { ListIcon, ListRow, ListSection } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { requirementLabel, requirementTarget } from "./requirements";

/**
 * What a rank asks for, one row per requirement. A challenge row opens the
 * module's setup screen, where the challenge starts; a requirement the app
 * cannot meet (posting a position, publishing a game) opens the web page
 * where it is met, and says so.
 */
export function RankRequirementList({
  slug,
  title,
}: {
  readonly slug: EarnedRankSlug;
  readonly title?: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const requirements = RANK_REQUIREMENTS[slug];
  const hasWebOnly = requirements.some(
    (r) => requirementTarget(r).kind === "web",
  );

  return (
    <ListSection
      title={title}
      footer={hasWebOnly ? t("dojo.webOnlyNote") : undefined}
    >
      {requirements.map((requirement, index) => {
        const target = requirementTarget(requirement);
        return (
          <ListRow
            key={index}
            leading={
              <ListIcon
                ionicon={
                  target.kind === "practice"
                    ? "stopwatch-outline"
                    : "globe-outline"
                }
              />
            }
            title={requirementLabel(requirement, t)}
            subtitle={
              target.kind === "practice"
                ? t("dojo.challengeHint")
                : t("dojo.webOnly")
            }
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
