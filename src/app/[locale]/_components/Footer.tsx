import { FaGithub } from 'react-icons/fa';
import { LanguageSwitcher } from './LanguageSwitcher';

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* GitHub Link */}
          <a
            href="https://github.com/checkmate-works/blindfold-chess"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <FaGithub className="h-5 w-5" />
          </a>

          {/* Language Switcher */}
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
    </footer>
  );
}
