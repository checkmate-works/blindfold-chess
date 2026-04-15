/**
 * DefinedTermSet schema
 * @see https://schema.org/DefinedTermSet
 */
export function generateDefinedTermSetSchema(params: {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  terms: Array<{ name: string; description: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: params.name,
    description: params.description,
    url: params.url,
    inLanguage: params.inLanguage,
    hasDefinedTerm: params.terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.name,
      description: term.description,
      url: term.url,
      inDefinedTermSet: params.url,
    })),
  };
}
