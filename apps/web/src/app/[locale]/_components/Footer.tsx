import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { SITE_DOMAIN } from '@/config';
import { FaGithub } from 'react-icons/fa';

import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  locale: string;
  hideLanguageSwitcher?: boolean;
};

export async function Footer({ locale, hideLanguageSwitcher }: Props) {
  const [
    tFooter,
    tManual,
    tGlossary,
    tAnnouncements,
    tFaq,
    tContact,
    tPrivacy,
    tTerms,
    tCompany,
    tAffiliate,
  ] = await Promise.all([
    getTranslations({ locale, namespace: 'Footer' }),
    getTranslations({ locale, namespace: 'manual' }),
    getTranslations({ locale, namespace: 'glossary' }),
    getTranslations({ locale, namespace: 'announcements' }),
    getTranslations({ locale, namespace: 'faq' }),
    getTranslations({ locale, namespace: 'contact' }),
    getTranslations({ locale, namespace: 'privacy' }),
    getTranslations({ locale, namespace: 'terms' }),
    getTranslations({ locale, namespace: 'company' }),
    getTranslations({ locale, namespace: 'affiliateDisclosure' }),
  ]);

  const isContactFormEnabled = !!process.env.RESEND_API_KEY;

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category columns */}
        <nav className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tFooter('resources')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href={`/${locale}/manual`}
                  className="hover:text-foreground transition-colors"
                >
                  {tManual('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/glossary`}
                  className="hover:text-foreground transition-colors"
                >
                  {tGlossary('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/announcements`}
                  className="hover:text-foreground transition-colors"
                >
                  {tAnnouncements('pageTitle')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tFooter('support')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/faq`} className="hover:text-foreground transition-colors">
                  {tFaq('title')}
                </Link>
              </li>
              {isContactFormEnabled && (
                <li>
                  <Link
                    href={`/${locale}/contact`}
                    className="hover:text-foreground transition-colors"
                  >
                    {tContact('title')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tFooter('legal')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-foreground transition-colors">
                  {tTerms('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:text-foreground transition-colors"
                >
                  {tPrivacy('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/company`}
                  className="hover:text-foreground transition-colors"
                >
                  {tCompany('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/affiliate-disclosure`}
                  className="hover:text-foreground transition-colors"
                >
                  {tAffiliate('title')}
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Divider */}
        <div className="mt-8 border-t border-border pt-6">
          {/* Social & Language */}
          <div className="flex justify-between items-center">
            <a
              href="https://github.com/checkmate-works/blindfold-chess"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <FaGithub className="h-5 w-5" />
            </a>

            {!hideLanguageSwitcher && <LanguageSwitcher currentLocale={locale} />}
          </div>

          {/* Copyright & Disclaimer */}
          <div className="mt-4 text-center text-xs text-muted-foreground space-y-1">
            <p>{tAffiliate('footerText')}</p>
            <p>
              © {new Date().getFullYear()} {SITE_DOMAIN}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
