import { getTranslations } from 'next-intl/server';

type Props = {
  namespace: 'signIn' | 'signUp';
};

export async function AuthErrorMessage({ namespace }: Props) {
  const t = await getTranslations(namespace);

  return (
    <div className="max-w-sm mx-auto mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
      <p className="text-sm text-destructive">{t('authError')}</p>
    </div>
  );
}
