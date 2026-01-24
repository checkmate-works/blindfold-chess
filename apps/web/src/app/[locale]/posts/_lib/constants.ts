export const CATEGORY_ICONS: Record<string, string> = {
  updates: '📢',
  blog: '📝',
};

export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] || '📄';
}
