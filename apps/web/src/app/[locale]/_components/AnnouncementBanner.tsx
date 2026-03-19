'use client';

import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  title: string;
  href: string;
};

export function AnnouncementBanner({ id, title, href }: Props) {
  const router = useRouter();

  function handleDismiss() {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `dismissed-announcement=${id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
    router.refresh();
  }

  return (
    <div role="status" className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-2 text-sm">
        <a href={href} className="truncate hover:underline">
          📢 {title}
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-4 shrink-0 p-1 rounded hover:bg-primary-foreground/20 transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
