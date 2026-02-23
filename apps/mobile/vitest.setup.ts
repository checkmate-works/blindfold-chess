import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
  },
}));

// Helper to clear the mock store between tests
export function clearMockAsyncStorage() {
  Object.keys(store).forEach((key) => delete store[key]);
}
