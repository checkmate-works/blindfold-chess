import Link from 'next/link';

import { buildCushionPageUrl, linkifyText } from '@/lib/content/linkify-urls';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

// Note: this component is intentionally NOT a client component. Internal
// URLs are rendered via `next/link` (which is itself a client island but does
// not force the host into a client boundary), and external URLs use a plain
// `<a>` with cushion-page redirect. The click-to-detail behavior on a comment
// card is provided by a sibling permalink anchor on the timestamp (see
// BaseTopicPostCard / home TopicPostCard).

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
            >
              {segment.display}
            </a>
          );
        }

        return (
          <Link key={i} href={segment.href} className={`break-all ${TEXT_LINK_CLASSES}`}>
            {segment.display}
          </Link>
        );
      })}
    </>
  );
}
