import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { SITE_DOMAIN } from '@/config';
import { FaBook, FaGraduationCap, FaList, FaNewspaper, FaQuestionCircle } from 'react-icons/fa';

type Props = {
  locale: string;
};

export async function DashboardFooter({ locale }: Props) {
  const [tLearn, tArticles, tGlossary, tManual, tFaq] = await Promise.all([
    getTranslations({ locale, namespace: 'learn' }),
    getTranslations({ locale, namespace: 'articles' }),
    getTranslations({ locale, namespace: 'glossary' }),
    getTranslations({ locale, namespace: 'manual' }),
    getTranslations({ locale, namespace: 'faq' }),
  ]);

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          <nav>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              <li>
                <Link
                  href={`/${locale}/learn`}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-1"
                >
                  <FaGraduationCap className="h-3 w-3" />
                  {tLearn('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/articles`}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-1"
                >
                  <FaNewspaper className="h-3 w-3" />
                  {tArticles('pageTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/glossary`}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-1"
                >
                  <FaList className="h-3 w-3" />
                  {tGlossary('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/manual`}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-1"
                >
                  <FaBook className="h-3 w-3" />
                  {tManual('title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-1"
                >
                  <FaQuestionCircle className="h-3 w-3" />
                  {tFaq('title')}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {SITE_DOMAIN}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
