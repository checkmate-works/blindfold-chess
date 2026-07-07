import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { AD_SLOT_VALUES } from '@/lib/ads/registry';

import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdCreativeForm } from '../_components/AdCreativeForm';
import { buildAdCreativeFormLabels } from '../_lib/form-labels';

export default async function NewAdCreativePage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: t('title'), href: '/admin/ads' }, { label: t('createTitle') }]}
      />
      <AdCreativeForm
        mode="create"
        locales={SUPPORTED_LOCALES}
        labels={buildAdCreativeFormLabels(t)}
        initial={{
          slot: AD_SLOT_VALUES[0],
          href: '',
          isActive: true,
          sortOrder: 0,
          startAt: '',
          endAt: '',
          targetCountries: null,
          payload: {
            avatarImagePath: null,
            avatarAlt: 'Advertisement',
            title: {},
            description: {},
          },
        }}
      />
    </div>
  );
}
