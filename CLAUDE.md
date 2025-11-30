# Project Implementation Guidelines

This document outlines the technical decisions and implementation guidelines for the Blindfold Chess project.

## Core Architecture

### Framework & Routing
- **Next.js App Router** - Use App Router exclusively (no Pages Router)
- **Server Components by Default** - Prefer Server Components for SEO benefits
- **Route Groups** - Use route groups like `(landing)` for organization without affecting URLs

### SEO Optimization
- **Server-Side Rendering** - Maximize SSR for better search engine crawling
- **Link Components** - Always use Next.js Link with required `href` attributes for crawler accessibility
  - Reference: https://nextjs.org/learn/seo/on-page-seo#nextlink
- **Semantic HTML** - Use proper HTML elements for better SEO

## Technology Stack

### Core Technologies
- **Next.js 15.5+** - Latest stable version
- **TypeScript** - Strict mode enabled
- **Turbopack** - Use for development builds (`--turbopack` flag)
- **pnpm** - Package manager

### Styling
- **Tailwind CSS v4** - Latest alpha version, maintain latest updates
- **CSS Variables** - Define theme colors in `globals.css`
- **No Hardcoded Colors** - Use CSS variable-based utilities instead of direct color classes (e.g., `text-foreground` instead of `text-gray-800`)
- **Dark Mode Support** - Implement with `next-themes` and CSS variables
- **Minimal External CSS** - Avoid external CSS files, use Tailwind utilities inline
- **Icons** - Use `react-icons` package for all icons (includes Font Awesome, Material Icons, etc.)

### CSS Implementation Details
- **@theme Directive** - Use Tailwind v4's `@theme` for custom utilities
- **@custom-variant** - Define dark mode variant with `@custom-variant dark`
- **Theme Colors in globals.css** - Centralize all theme variables in one file

## Internationalization
- **next-intl** - For i18n support
- **URL Path-based Locales** - Use `/[locale]/` pattern
- **Supported Languages** - English (`en`) and Japanese (`ja`)

## Testing

### Framework
- **Vitest** - Unit and integration testing framework

### Test File Organization
- **Unit Tests** - Co-located with source files using `.test.ts` or `.test.tsx` extension
- **Integration Tests** - Separate directory at `tests/integration/`
- **E2E Tests** - Separate directory at `tests/e2e/`

### File Structure Examples
```
src/components/Button/Button.test.tsx    # Component unit test
src/lib/utils.test.ts                    # Utility unit test
tests/integration/api/validation.test.ts # Integration test
tests/e2e/practice-flow.e2e.ts          # E2E test
```

## Code Quality

### Development Tools
- **ESLint** - Automated linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

### Best Practices
- **Component Colocation** - Keep related files close to their components
- **Image Optimization** - Always use Next.js Image component
- **Font Optimization** - Use `next/font` for web fonts (Inter)

### Import Path Convention
- **Same Directory** - Use relative imports: `import { Foo } from './Foo'`
- **Parent Directory** - Use relative imports: `import { Bar } from '../Bar'`
- **Two or More Levels Up** - Use absolute imports with `@` alias: `import { Baz } from '@/app/[locale]/_components/Baz'`
- **lib Directory** - Always use `@/lib/...` for shared utilities and types

### Import Order Convention
Imports are automatically sorted by Prettier using `@trivago/prettier-plugin-sort-imports` in the following order:

1. React imports
2. Next.js imports
3. Third-party modules
4. `@/lib/` imports
5. `@/app/[locale]/` imports
6. Relative imports (`.` and `..`)

Groups are separated by blank lines, and specifiers within imports are sorted alphabetically.

**Examples:**
```typescript
// ✓ Good - proper import path usage
import { Button } from './Button';
import { Header } from '../Header';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

// ✗ Bad - don't use deep relative paths
import { PageTitle } from '../../_components/PageTitle';

// ✓ Good - proper import order (automatically enforced by Prettier)
import React from 'react';

import { useRouter } from 'next/navigation';

import { format } from 'date-fns';

import type { Game } from '@/lib/types';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Button } from './Button';
```

## File Structure
- **Unopinionated Approach** - Follow Next.js flexibility
- **No Forced Structure** - Organize based on project needs
- **Global Styles** - Keep in `src/app/globals.css`

## Development Commands
```bash
pnpm dev        # Start development server with Turbopack
pnpm build      # Production build
pnpm lint       # Run ESLint
```

## Feature Documentation

Feature-specific documentation is written as TSDoc comments in each feature's `page.tsx` file.
This keeps documentation close to the code and avoids bloating this global file.

### Convention
- **Feature Name** - First line format: `Feature Name (日本語名)`. The Japanese subtitle enables Japanese prompt engineering while keeping the primary name in English for OSS compatibility.
- **@description** - What the feature does (purpose and goals)
- **@flow** - How the feature works (user journey / phase transitions)

Avoid documenting information that is self-evident from the code (routes, components, query params with meaningful names).

## Important Notes
- Always maintain latest package versions unless there's a breaking change
- Prioritize performance and SEO in all decisions
- Keep the codebase simple and maintainable