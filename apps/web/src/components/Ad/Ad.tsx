import Link from 'next/link';

import { FaExternalLinkAlt } from 'react-icons/fa';

export interface AdProps {
  href: string;
  text: string;
  className?: string;
}

export function Ad({ href, text, className }: AdProps) {
  return (
    <Link href={href} className={className} rel="noopener noreferrer sponsored" target="_blank">
      <span className="inline-flex items-center gap-1">
        <FaExternalLinkAlt className="h-3.5 w-3.5" />
        {text}
      </span>
    </Link>
  );
}
