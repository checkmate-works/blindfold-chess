export type AdCreativeFormLabels = {
  slot: string;
  kind: string;
  href: string;
  hrefPlaceholder: string;
  isActive: string;
  sortOrder: string;
  startAt: string;
  endAt: string;
  imagePath: string;
  imagePathPlaceholder: string;
  alt: string;
  altPlaceholder: string;
  width: string;
  height: string;
  avatar: string;
  avatarAlt: string;
  avatarUpload: string;
  avatarUploading: string;
  avatarHintCreate: string;
  title: string;
  description: string;
  targetCountries: string;
  targetCountriesHint: string;
  save: string;
  saving: string;
  cancel: string;
};

/** Build the creative-form label bundle from the admin translator. */
export function buildAdCreativeFormLabels(t: (key: string) => string): AdCreativeFormLabels {
  return {
    slot: t('slot'),
    kind: t('kind'),
    href: t('href'),
    hrefPlaceholder: t('hrefPlaceholder'),
    isActive: t('isActive'),
    sortOrder: t('sortOrder'),
    startAt: t('startAt'),
    endAt: t('endAt'),
    imagePath: t('imagePath'),
    imagePathPlaceholder: t('imagePathPlaceholder'),
    alt: t('alt'),
    altPlaceholder: t('altPlaceholder'),
    width: t('width'),
    height: t('height'),
    avatar: t('avatar'),
    avatarAlt: t('avatarAlt'),
    avatarUpload: t('avatarUpload'),
    avatarUploading: t('avatarUploading'),
    avatarHintCreate: t('avatarHintCreate'),
    title: t('cardTitle'),
    description: t('cardDescription'),
    targetCountries: t('targetCountries'),
    targetCountriesHint: t('targetCountriesHint'),
    save: t('save'),
    saving: t('saving'),
    cancel: t('cancel'),
  };
}
