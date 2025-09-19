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

## Important Notes
- Always maintain latest package versions unless there's a breaking change
- Prioritize performance and SEO in all decisions
- Keep the codebase simple and maintainable