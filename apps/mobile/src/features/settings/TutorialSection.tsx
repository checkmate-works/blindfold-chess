import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";

/**
 * The way back into the introduction (the mentor's chat, `/onboarding`),
 * which the home tab no longer lists. Replaying it plays the chat again
 * without touching the stored "onboarding done" flag; a development build
 * also gets a row that clears the flag, so the first-launch redirect and
 * the account offer after the first session can be checked again.
 */
export function TutorialSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearStatus } = useOnboardingStatus();
  // Settings lives in the account modal, and a root-stack screen pushed from
  // inside a modal opens under it on iOS, out of sight. Close the modal first.
  const openOnboarding = () => {
    router.dismissTo("/");
    router.push("/onboarding");
  };

  return (
    <ListSection title={t("settings.tutorial.title")}>
      <ListRow
        leading={<ListIcon ionicon="chatbubbles-outline" />}
        title={t("settings.tutorial.replay")}
        onPress={openOnboarding}
        testID="settings-replay-onboarding"
      />
      {__DEV__ ? (
        <ListRow
          leading={<ListIcon ionicon="refresh-outline" />}
          title="Reset Onboarding (Debug)"
          onPress={async () => {
            await clearStatus();
            openOnboarding();
          }}
        />
      ) : null}
    </ListSection>
  );
}
