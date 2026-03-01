import { useTranslation } from "react-i18next";
import { TimeLimitSettingsForm } from "../../../components";

type SettingsFormProps = {
  timeLimit: number;
  onUpdateTimeLimit: (timeLimit: number) => void;
};

export function SettingsForm({
  timeLimit,
  onUpdateTimeLimit,
}: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <TimeLimitSettingsForm
      timeLimit={timeLimit}
      onUpdateTimeLimit={onUpdateTimeLimit}
      timeLimitLabel={t("boardSymmetry.settings.timeLimit")}
      formatSeconds={(seconds) =>
        t("boardSymmetry.settings.seconds", { seconds })
      }
    />
  );
}
