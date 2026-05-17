import { getTranslations } from 'next-intl/server';

import { FormErrorBanner } from '@/app/_components/FormErrorBanner';

type Props = {
  namespace: 'signIn' | 'signUp';
};

export async function AuthErrorMessage({ namespace }: Props) {
  const t = await getTranslations(namespace);

  return (
    <div className="max-w-sm mx-auto mb-4">
      <FormErrorBanner variant="bordered" message={t('authError')} />
    </div>
  );
}
