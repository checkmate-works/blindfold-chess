import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.play' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function PlayLayout({ children }: Props) {
  return <>{children}</>;
}
