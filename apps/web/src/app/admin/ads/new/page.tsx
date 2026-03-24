import { getTranslations } from 'next-intl/server';

import { BannerCreateForm } from '../_components/BannerCreateForm';

export default async function NewAdBannerPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });

  return (
    <BannerCreateForm
      labels={{
        formTitle: t('createTitle'),
        slot: t('slot'),
        slotPlaceholder: t('slotPlaceholder'),
        href: t('href'),
        hrefPlaceholder: t('hrefPlaceholder'),
        imagePath: t('imagePath'),
        imagePathPlaceholder: t('imagePathPlaceholder'),
        alt: t('alt'),
        altPlaceholder: t('altPlaceholder'),
        width: t('width'),
        height: t('height'),
        isActive: t('isActive'),
        sortOrder: t('sortOrder'),
        startAt: t('startAt'),
        endAt: t('endAt'),
        create: t('create'),
        creating: t('creating'),
        cancel: t('cancel'),
      }}
    />
  );
}
