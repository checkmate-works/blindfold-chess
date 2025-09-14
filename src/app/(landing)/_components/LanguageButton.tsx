import Link from 'next/link';

interface LanguageButtonProps {
  href: string;
  flag: string;
  language: string;
  subtitle: string;
}

export function LanguageButton({ href, flag, language, subtitle }: LanguageButtonProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-start px-6 py-3 rounded-xl transition-all duration-300 no-underline w-full sm:w-auto sm:min-w-[10rem] bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 min-h-[3.5rem] box-border hover:scale-[1.02] hover:border-gray-300 dark:hover:border-slate-500"
    >
      <div className="relative flex items-center gap-3">
        <span className="text-xl">{flag}</span>
        <div className="text-left">
          <p className="text-base font-semibold m-0 text-slate-900 dark:text-slate-50 leading-none">
            {language}
          </p>
          <p className="text-xs m-0 text-slate-500 dark:text-slate-400 leading-tight mt-1">
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}
