'use client';

import { useState } from 'react';

import { FaInfoCircle } from 'react-icons/fa';

type Props = {
  content: string;
  className?: string;
};

export function Tooltip({ content, className = '' }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Show information"
      >
        <FaInfoCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <div className="absolute z-50 w-64 p-3 bg-popover text-popover-foreground border border-border rounded-md shadow-lg left-1/2 -translate-x-1/2 bottom-full mb-2">
          <div className="text-sm">{content}</div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border" />
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-popover -mt-px" />
        </div>
      )}
    </div>
  );
}
