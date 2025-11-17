import Image from 'next/image';

import { SITE_DOMAIN, SITE_NAME } from '@/config';

import { LanguageButton } from './_components/LanguageButton';

type LanguageOption = {
  code: 'en' | 'ja';
  label: string;
  flag: string;
  subtitle: string;
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    flag: '🇬🇧',
    subtitle: 'Continue in English',
  },
  {
    code: 'ja',
    label: '日本語',
    flag: '🇯🇵',
    subtitle: '日本語で続ける',
  },
] as const;

export default function RootPage() {
  return (
    <div className="fixed inset-0 min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
      <div className="text-center px-6 py-6 md:px-4 w-full max-w-lg box-border">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt={`${SITE_NAME} Logo`}
            width={96}
            height={96}
            className="w-24 h-24"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground leading-tight">
          {SITE_NAME}
        </h1>

        <div className="flex flex-col sm:flex-row sm:justify-center gap-3 sm:gap-4 items-stretch w-full">
          {LANGUAGE_OPTIONS.map((locale) => (
            <LanguageButton
              key={locale.code}
              href={`/${locale.code}`}
              flag={locale.flag}
              language={locale.label}
              subtitle={locale.subtitle}
            />
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_DOMAIN}
      </div>
    </div>
  );
}
