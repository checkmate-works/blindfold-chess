import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaChevronRight, FaGithub } from 'react-icons/fa';

import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  locale: string;
};

export async function Footer({ locale }: Props) {
  const tPrivacy = await getTranslations({ locale, namespace: 'privacy' });
  const tTerms = await getTranslations({ locale, namespace: 'terms' });
  const tCompany = await getTranslations({ locale, namespace: 'company' });

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {/* Legal pages - vertical menu */}
          <nav>
            <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <FaChevronRight className="h-2 w-2" />
                  {tPrivacy('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <FaChevronRight className="h-2 w-2" />
                  {tTerms('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/company`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <FaChevronRight className="h-2 w-2" />
                  {tCompany('title')}
                </Link>
              </li>
            </ul>
          </nav>

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

            <LanguageSwitcher currentLocale={locale} />
          </div>

          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Blindfold Chess
          </div>
        </div>
      </div>
    </footer>
  );
}
