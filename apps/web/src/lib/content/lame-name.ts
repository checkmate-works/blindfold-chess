/**
 * Profanity filter — server-side only wrapper.
 *
 * The core logic lives in @blindfold-chess/features/lame-name.
 * This file enforces the server-only constraint for the web app.
 *
 * SERVER-SIDE ONLY — do not import from client components.
 */
import 'server-only';

export { isLameName } from '@blindfold-chess/features/lame-name';
