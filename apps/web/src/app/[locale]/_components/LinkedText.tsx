'use client';

import { buildCushionPageUrl, linkifyText } from '@/lib/content/linkify-urls';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  text: string;
  locale: string;
};

export function LinkedText({ text, locale }: Props) {
  const segments = linkifyText(text);

  if (segments.length === 1 && segments[0].type === 'text') {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return <span key={i}>{segment.value}</span>;
        }

        if (segment.isExternal) {
          return (
            <a
              key={i}
              href={buildCushionPageUrl(segment.href, locale)}
              rel="noopener noreferrer"
              className={`break-all ${TEXT_LINK_CLASSES}`}
              onClick={(e) => e.stopPropagation()}
            >
              {segment.display}
            </a>
          );
        }

        return (
          <a
            key={i}
            href={segment.href}
            className={`break-all ${TEXT_LINK_CLASSES}`}
            onClick={(e) => e.stopPropagation()}
          >
            {segment.display}
          </a>
        );
      })}
    </>
  );
}
