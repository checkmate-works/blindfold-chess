import Link from 'next/link';

import { FaExternalLinkAlt } from 'react-icons/fa';

export interface AdProps {
  href: string;
  text: string;
  className?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export function Ad({ href, text, className, imageUrl, imageAlt }: AdProps) {
  return (
    <Link href={href} className={className} rel="noopener noreferrer sponsored" target="_blank">
      {imageUrl ? (
        <div className="relative w-full overflow-hidden flex justify-center items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt || text}
            className="w-auto h-[40px] sm:h-[50px] object-contain transition-transform hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <span className="inline-flex items-center gap-1">
          <FaExternalLinkAlt className="h-3.5 w-3.5" />
          {text}
        </span>
      )}
    </Link>
  );
}
