# @blindfold-chess/icons

Cross-platform SVG icon components shared between web (React DOM) and mobile (React Native).

## Architecture

```
src/
├── data/           # Platform-independent SVG path data (pure JS objects)
│   ├── types.ts    # SVG element type definitions (SvgPathData, SvgCircleData, etc.)
│   ├── chess-pieces.ts
│   ├── spinner.ts
│   └── index.ts    # Re-exports all data
├── components/
│   ├── types.ts    # Shared component prop types (ChessPieceIconProps, SpinnerIconProps)
│   ├── web/        # React DOM renderer (uses <svg>, <path>, <circle>)
│   │   └── index.tsx
│   └── native/     # React Native renderer (uses react-native-svg: Svg, Path, Circle)
│       └── index.tsx
```

### Data / Renderer Separation

- **`src/data/`**: Contains only plain JavaScript objects describing SVG shapes. No React imports, no platform-specific code. This layer is shared as-is across all platforms.
- **`src/components/web/`**: Renders SVG data using standard HTML `<svg>` elements. Used by the Next.js web app.
- **`src/components/native/`**: Renders the same SVG data using `react-native-svg` components (`Svg`, `Path`, `Circle`, `G`). Used by the Expo mobile app.

### Conditional Exports (package.json)

The `exports` field automatically resolves the correct renderer based on the platform:

- React Native bundlers → `src/components/native/index.tsx`
- All other environments (Next.js, etc.) → `src/components/web/index.tsx`
- Raw SVG data (no React dependency) → importable via `@blindfold-chess/icons/data`

## Adding a New Icon

1. **Create SVG data** in `src/data/` (e.g., `src/data/undo.ts`):
   - Define a typed object with `viewBox` and SVG element data
   - Export it and re-export from `src/data/index.ts`

2. **Add web renderer** in `src/components/web/index.tsx`:
   - Import the data, create a React component with `className` prop support
   - Export the component

3. **Add native renderer** in `src/components/native/index.tsx`:
   - Import the same data, create a React Native component with `style` prop support
   - Export the component

4. **Update shared types** in `src/components/types.ts` if the new icon needs custom props beyond `size` and `color`
