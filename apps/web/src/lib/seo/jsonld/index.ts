// `JsonLd` is a synchronous, client-safe component with no `next/headers`
// dependency (JSON-LD data blocks are exempt from `script-src`, so no CSP
// nonce is needed — see the docblock in `./JsonLd.tsx`), so re-exporting it
// from this barrel does not drag any server-only API into a client-reachable
// import graph.
export { JsonLd } from './JsonLd';
export { generateWebSiteSchema } from './website';
export { generateOrganizationSchema } from './organization';
export { generateWebApplicationSchema } from './webapplication';
export { generateBreadcrumbListSchema, type BreadcrumbItem } from './breadcrumb';
export { generateFAQPageSchema, type FAQItemData } from './faq';
export { generateArticleSchema, type ArticleData } from './article';
export { generateBlogPostingSchema, type BlogPostData } from './blog-posting';
export { generateDefinedTermSetSchema } from './defined-term-set';
export { generateDefinedTermSchema } from './defined-term';
export { generateItemListSchema, type ItemListItemData } from './item-list';
export { generateLearningResourceSchema, type LearningResourceData } from './learning-resource';
