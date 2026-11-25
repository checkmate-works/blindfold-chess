import { Platform } from "react-native";

/**
 * The web's `font-mono` for square names: the system's monospaced face, so
 * a route's squares line up as they do on the web.
 */
export const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";
