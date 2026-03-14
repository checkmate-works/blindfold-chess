export function truncateContent(content: string, maxLength = 200): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trimEnd() + '...';
}
