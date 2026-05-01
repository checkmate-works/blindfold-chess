# @blindfold-chess/icons

Cross-platform SVG icon components shared between web (React DOM) and mobile (React Native).

## Architecture

```
src/
├── data/                   # Platform-independent SVG path data (pure JS objects)
│   ├── types.ts            # SVG element type definitions (SvgPathData, SvgCircleData, etc.)
│   ├── chess-pieces.ts
│   ├── spinner.ts
│   └── index.ts            # Re-exports all data
├── components/
│   ├── types.ts            # Shared component prop types (ChessPieceIconProps, SpinnerIconProps)
│   ├── _shared/
│   │   └── create-icon-renderer.tsx  # Shared factory that builds every icon component from a set of SVG primitives
│   ├── web/                # React DOM renderer (passes "svg"/"circle"/"path"/"g" to the factory)
│   │   └── index.tsx
│   └── native/             # React Native renderer (passes Svg/Circle/Path/G from react-native-svg)
│       └── index.tsx
```

### Data / Renderer Separation

- **`src/data/`**: Contains only plain JavaScript objects describing SVG shapes. No React imports, no platform-specific code. This layer is shared as-is across all platforms.
- **`src/components/_shared/create-icon-renderer.tsx`**: A platform-neutral factory that takes the set of SVG primitives (`Svg`, `Circle`, `Path`, `G`) and returns the icon components (`SpinnerIcon`, `ChessPieceIcon`, `RatingFaceIcon`, `UndoIcon`, `FlagIcon`, plus the `createStrokeIcon` HOF). All rendering logic — including the recursive `<g>` element walker and the stroke-icon builder — lives here exactly once.
- **`src/components/web/`**: Calls the factory with the standard HTML SVG element names (`"svg"`, `"path"`, `"circle"`, `"g"`) and re-exports the returned components with web-flavored prop types (`className`, `SVGProps<SVGSVGElement>`). Used by the Next.js web app.
- **`src/components/native/`**: Calls the factory with the `Svg`, `Path`, `Circle`, `G` components from `react-native-svg` and re-exports them with React Native-flavored prop types (`StyleProp<ViewStyle>`). Used by the Expo mobile app.

### Conditional Exports (package.json)

The `exports` field automatically resolves the correct renderer based on the platform:

- React Native bundlers → `src/components/native/index.tsx`
- All other environments (Next.js, etc.) → `src/components/web/index.tsx`
- Raw SVG data (no React dependency) → importable via `@blindfold-chess/icons/data`

## Adding a New Icon

1. **Create SVG data** in `src/data/` (e.g., `src/data/undo.ts`):
   - Define a typed object with `viewBox` and SVG element data
   - Export it and re-export from `src/data/index.ts`

2. **Add the icon to the shared factory** in `src/components/_shared/create-icon-renderer.tsx`:
   - Import the data and instantiate the component (or use `createStrokeIcon` for stroke-based icons)
   - Include it in the object returned by `createIconRenderer`

3. **Re-export the new icon** from both renderer barrels:
   - `src/components/web/index.tsx` — add to the `factory.*` re-exports with the web-flavored prop type
   - `src/components/native/index.tsx` — add to the `factory.*` re-exports with the native-flavored prop type
   - The actual rendering code is written **only once** in the factory; the per-renderer files just narrow the prop types for their platform.

4. **Update shared types** in `src/components/types.ts` if the new icon needs custom props beyond `size` and `color`.
