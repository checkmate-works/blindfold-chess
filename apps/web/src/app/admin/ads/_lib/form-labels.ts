export type AdCreativeFormLabels = {
  slot: string;
  kind: string;
  href: string;
  hrefHint: string;
  hrefPlaceholder: string;
  isActive: string;
  avatar: string;
  avatarAlt: string;
  avatarUpload: string;
  avatarUploading: string;
  avatarHintCreate: string;
  thumbnail: string;
  thumbnailFen: string;
  thumbnailFenPlaceholder: string;
  thumbnailImageOverride: string;
  thumbnailImageUpload: string;
  thumbnailImageUploading: string;
  thumbnailImageRemove: string;
  thumbnailImageHintCreate: string;
  thumbnailAlt: string;
  icon: string;
  iconHint: string;
  preview: string;
  previewCaption: string;
  title: string;
  description: string;
  cardCopyHint: string;
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
    hrefHint: t('hrefHint'),
    hrefPlaceholder: t('hrefPlaceholder'),
    isActive: t('isActive'),
    avatar: t('avatar'),
    avatarAlt: t('avatarAlt'),
    avatarUpload: t('avatarUpload'),
    avatarUploading: t('avatarUploading'),
    avatarHintCreate: t('avatarHintCreate'),
    thumbnail: t('thumbnail'),
    thumbnailFen: t('thumbnailFen'),
    thumbnailFenPlaceholder: t('thumbnailFenPlaceholder'),
    thumbnailImageOverride: t('thumbnailImageOverride'),
    thumbnailImageUpload: t('thumbnailImageUpload'),
    thumbnailImageUploading: t('thumbnailImageUploading'),
    thumbnailImageRemove: t('thumbnailImageRemove'),
    thumbnailImageHintCreate: t('thumbnailImageHintCreate'),
    thumbnailAlt: t('thumbnailAlt'),
    icon: t('tileIcon'),
    iconHint: t('tileIconHint'),
    preview: t('preview'),
    previewCaption: t('previewCaption'),
    title: t('cardTitle'),
    description: t('cardDescription'),
    cardCopyHint: t('cardCopyHint'),
    save: t('save'),
    saving: t('saving'),
    cancel: t('cancel'),
  };
}
