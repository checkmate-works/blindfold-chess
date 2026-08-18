import type { RepertoireVisibility } from '@/lib/points/spend-catalog';

/**
 * RepertoireVisibility (snake) → its `Repertoires.visibility.*` i18n key
 * (camel). The import form and the visibility control each declared this,
 * comment included.
 */
export const VISIBILITY_I18N_KEY: Record<RepertoireVisibility, string> = {
  public: 'public',
  followers_only: 'followersOnly',
  private: 'private',
};
