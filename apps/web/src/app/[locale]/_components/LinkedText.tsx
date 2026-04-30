import { buildCushionPageUrl, linkifyText } from '@/lib/content/linkify-urls';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

// Note: this component is intentionally NOT a client component. It renders
// pure HTML (`<a>` / `<span>`) with no event handlers — the click-to-detail
// behavior on a comment card is provided by a sibling permalink anchor on
// the timestamp (see BaseTopicPostCard / home TopicPostCard). Keeping this
// pure means it can be rendered inside a Server Component without forcing
// the host into a client boundary.

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
          <a key={i} href={segment.href} className={`break-all ${TEXT_LINK_CLASSES}`}>
            {segment.display}
          </a>
        );
      })}
    </>
  );
}
