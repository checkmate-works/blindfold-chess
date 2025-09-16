import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface HeaderProps {
  locale: string;
}

export async function Header({ locale }: HeaderProps) {
  const t = await getTranslations({ locale, namespace: 'Header' });

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-bold">
            {t('title')}
          </Link>
        </div>
      </div>
    </header>
  );
}
