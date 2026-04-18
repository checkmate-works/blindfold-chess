export type FAQItemData = {
  question: string;
  answer: string;
};

/**
 * FAQPage schema
 * @see https://schema.org/FAQPage
 */
export function generateFAQPageSchema(items: FAQItemData[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
