import type { InterpolatingTranslator } from '@/i18n/translator';

import { getPublishableFormLabels } from '../../_lib/publishable-form-labels';

/**
 * Build a labels object for `AnnouncementForm` from the i18n translation
 * function.
 *
 * Centralizes label resolution so that `NewAnnouncementPage` and
 * `EditAnnouncementPage` only need to pass the appropriate `formTitle`
 * (create vs. edit). An announcement has no fields beyond the shared
 * draft-then-publish set, so this is that set unchanged.
 */
export function getAnnouncementFormLabels(t: InterpolatingTranslator, formTitle: string) {
  return getPublishableFormLabels(t, formTitle);
}
