export type AdCreativeFormLabels = {
  slot: string;
  kind: string;
  href: string;
  hrefPlaceholder: string;
  isActive: string;
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
  thumbnail: string;
  thumbnailBoard: string;
  thumbnailImage: string;
  thumbnailFen: string;
  thumbnailFenPlaceholder: string;
  thumbnailImageUpload: string;
  thumbnailImageUploading: string;
  thumbnailImageHintCreate: string;
  thumbnailAlt: string;
  preview: string;
  previewCaption: string;
  title: string;
  description: string;
  cardCopyHint: string;
  targetCountry: string;
  targetCountryHint: string;
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
    thumbnail: t('thumbnail'),
    thumbnailBoard: t('thumbnailBoard'),
    thumbnailImage: t('thumbnailImage'),
    thumbnailFen: t('thumbnailFen'),
    thumbnailFenPlaceholder: t('thumbnailFenPlaceholder'),
    thumbnailImageUpload: t('thumbnailImageUpload'),
    thumbnailImageUploading: t('thumbnailImageUploading'),
    thumbnailImageHintCreate: t('thumbnailImageHintCreate'),
    thumbnailAlt: t('thumbnailAlt'),
    preview: t('preview'),
    previewCaption: t('previewCaption'),
    title: t('cardTitle'),
    description: t('cardDescription'),
    cardCopyHint: t('cardCopyHint'),
    targetCountry: t('targetCountry'),
    targetCountryHint: t('targetCountryHint'),
    save: t('save'),
    saving: t('saving'),
    cancel: t('cancel'),
  };
}
